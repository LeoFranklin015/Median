import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { getChainById } from "./config";
import { chainClientManager } from "./chainClients";

const kit = new BridgeKit();

export interface BridgeParams {
    sourceChainId: number;
    destChainId: number;
    amount: string;
    recipientAddress?: string;
}

export interface BridgeResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

/**
 * Bridge USDC between chains using Circle's CCTP
 */
export async function bridgeUSDC(params: BridgeParams): Promise<BridgeResult> {
    const { sourceChainId, destChainId, amount, recipientAddress } = params;

    const sourceChain = getChainById(sourceChainId);
    const destChain = getChainById(destChainId);

    if (!sourceChain) {
        return { success: false, error: `Unsupported source chain: ${sourceChainId}` };
    }
    if (!destChain) {
        return { success: false, error: `Unsupported destination chain: ${destChainId}` };
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        return { success: false, error: 'PRIVATE_KEY not configured' };
    }

    try {
        const adapter = createViemAdapterFromPrivateKey({
            privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
        });

        console.log(`🌉 CCTP Bridge: ${amount} USDC`);
        console.log(`   From: ${sourceChain.name}`);
        console.log(`   To: ${destChain.name}`);
        if (recipientAddress) {
            console.log(`   Recipient: ${recipientAddress}`);
        }

        const result = await kit.bridge({
            from: { adapter, chain: sourceChain.name as any },
            to: {
                adapter,
                chain: destChain.name as any,
                ...(recipientAddress && { recipientAddress }),
            },
            amount,
        });

        console.log(`✅ CCTP Bridge complete!`);
        // Use replacer to handle BigInt serialization
        console.log(`   Result:`, JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

        return {
            success: true,
            txHash: (result as any).txHash || (result as any).hash || 'completed',
        };
    } catch (error) {
        console.error('❌ CCTP Bridge failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get estimated bridge time between chains (in seconds)
 * CCTP typically takes 10-20 minutes
 */
export function getEstimatedBridgeTime(): number {
    return 15 * 60; // 15 minutes average
}

/**
 * Check if a chain pair is supported for CCTP bridging
 */
export function isBridgeSupported(sourceChainId: number, destChainId: number): boolean {
    const sourceChain = getChainById(sourceChainId);
    const destChain = getChainById(destChainId);
    return !!sourceChain && !!destChain && sourceChainId !== destChainId;
}

// ============================================
// Cross-Chain Withdrawal (Yellow Network + CCTP)
// ============================================

export interface CrossChainWithdrawalParams {
    sourceChainId: number;
    destChainId: number;
    amount: string;
    userWallet: string;
}

export interface CrossChainWithdrawalResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

export interface CrossChainCallbacks {
    getOrCreateChannelForChain: (chainId: number) => Promise<string>;
    resizeChannelOnChain: (channelId: string, resizeAmount: bigint, allocateAmount: bigint, chainId: number) => Promise<{ txHash: string }>;
}

/**
 * Perform cross-chain withdrawal via Yellow Network channels and CCTP
 *
 * Flow:
 * 1. Move funds from unified balance to custody on source chain (if needed)
 * 2. Withdraw from custody to on-chain wallet
 * 3. Bridge via CCTP directly to user's wallet on destination chain
 */
export async function performCrossChainWithdrawal(
    params: CrossChainWithdrawalParams,
    callbacks: CrossChainCallbacks
): Promise<CrossChainWithdrawalResult> {
    const { sourceChainId, destChainId, amount, userWallet } = params;

    const amountFloat = parseFloat(amount);
    const amountAtomic = BigInt(Math.floor(amountFloat * 1_000_000));

    // Get chain configurations
    const sourceChain = getChainById(sourceChainId);
    const destChain = getChainById(destChainId);

    if (!sourceChain || !destChain) {
        return { success: false, error: 'Invalid chain configuration' };
    }

    console.log(`🌉 Cross-chain withdrawal: ${amount} USDC`);
    console.log(`   From: ${sourceChain.name} (${sourceChainId})`);
    console.log(`   To: ${destChain.name} (${destChainId})`);
    console.log(`   User: ${userWallet}`);

    try {
        // Check current balances to determine the best approach
        const custodyBalance = await chainClientManager.getCustodyBalance(sourceChainId);
        console.log(`📊 Current custody balance on ${sourceChain.name}: ${custodyBalance.toString()} (need: ${amountAtomic.toString()})`);

        // Step 1: Ensure we have funds in custody
        if (custodyBalance < amountAtomic) {
            console.log(`📤 Step 1: Moving funds from unified to custody on ${sourceChain.name}...`);

            // Get or create channel on source chain
            const sourceChannelId = await callbacks.getOrCreateChannelForChain(sourceChainId);
            console.log(`   Using channel: ${sourceChannelId}`);

            // Resize to move from unified balance to custody
            // resize_amount = -X, allocate_amount = +X
            const neededAmount = amountAtomic - custodyBalance;
            await callbacks.resizeChannelOnChain(sourceChannelId, -neededAmount, neededAmount, sourceChainId);
            console.log(`   Resized channel: moved ${Number(neededAmount) / 1_000_000} USDC to custody`);
        } else {
            console.log(`📤 Step 1: Skipped - sufficient funds already in custody`);
        }

        // Step 2: Withdraw from custody to on-chain wallet
        console.log(`📤 Step 2: Withdrawing from custody on ${sourceChain.name}...`);
        await chainClientManager.withdrawFromCustody(sourceChainId, amountAtomic);

        // Step 3: Bridge via CCTP directly to user's wallet
        console.log(`🌉 Step 3: Bridging via CCTP to ${userWallet} on ${destChain.name}...`);
        const bridgeResult = await bridgeUSDC({
            sourceChainId,
            destChainId,
            amount: amountFloat.toString(),
            recipientAddress: userWallet, // Send directly to user
        });

        if (!bridgeResult.success) {
            throw new Error(`CCTP Bridge failed: ${bridgeResult.error}`);
        }

        console.log(`✅ CCTP Bridge complete: ${bridgeResult.txHash}`);
        console.log(`   Funds sent directly to ${userWallet} on ${destChain.name}`);

        return {
            success: true,
            txHash: bridgeResult.txHash,
        };

    } catch (error) {
        console.error('❌ Cross-chain withdrawal failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
