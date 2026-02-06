import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { getChainById } from "./config";

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
        console.log(`   From: ${sourceChain.name} (${sourceChain.cctpName})`);
        console.log(`   To: ${destChain.name} (${destChain.cctpName})`);
        if (recipientAddress) {
            console.log(`   Recipient: ${recipientAddress}`);
        }

        const result = await kit.bridge({
            from: { adapter, chain: sourceChain.cctpName as any },
            to: {
                adapter,
                chain: destChain.cctpName as any,
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
