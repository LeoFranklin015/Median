"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeUSDC = bridgeUSDC;
exports.getEstimatedBridgeTime = getEstimatedBridgeTime;
exports.isBridgeSupported = isBridgeSupported;
exports.performCrossChainWithdrawal = performCrossChainWithdrawal;
const bridge_kit_1 = require("@circle-fin/bridge-kit");
const adapter_viem_v2_1 = require("@circle-fin/adapter-viem-v2");
const config_1 = require("./config");
const chainClients_1 = require("./chainClients");
const kit = new bridge_kit_1.BridgeKit();
async function bridgeUSDC(params) {
    const { sourceChainId, destChainId, amount, recipientAddress } = params;
    const sourceChain = (0, config_1.getChainById)(sourceChainId);
    const destChain = (0, config_1.getChainById)(destChainId);
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
        const adapter = (0, adapter_viem_v2_1.createViemAdapterFromPrivateKey)({
            privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
        });
        console.log(`🌉 CCTP Bridge: ${amount} USDC`);
        console.log(`   From: ${sourceChain.name}`);
        console.log(`   To: ${destChain.name}`);
        if (recipientAddress) {
            console.log(`   Recipient: ${recipientAddress}`);
        }
        const result = await kit.bridge({
            from: { adapter, chain: sourceChain.name },
            to: {
                adapter,
                chain: destChain.name,
                ...(recipientAddress && { recipientAddress }),
            },
            amount,
        });
        console.log(`✅ CCTP Bridge complete!`);
        console.log(`   Result:`, JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        return {
            success: true,
            txHash: result.txHash || result.hash || 'completed',
        };
    }
    catch (error) {
        console.error('❌ CCTP Bridge failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
function getEstimatedBridgeTime() {
    return 15 * 60;
}
function isBridgeSupported(sourceChainId, destChainId) {
    const sourceChain = (0, config_1.getChainById)(sourceChainId);
    const destChain = (0, config_1.getChainById)(destChainId);
    return !!sourceChain && !!destChain && sourceChainId !== destChainId;
}
async function performCrossChainWithdrawal(params, callbacks) {
    const { sourceChainId, destChainId, amount, userWallet } = params;
    const amountFloat = parseFloat(amount);
    const amountAtomic = BigInt(Math.floor(amountFloat * 1000000));
    const sourceChain = (0, config_1.getChainById)(sourceChainId);
    const destChain = (0, config_1.getChainById)(destChainId);
    if (!sourceChain || !destChain) {
        return { success: false, error: 'Invalid chain configuration' };
    }
    console.log(`🌉 Cross-chain withdrawal: ${amount} USDC`);
    console.log(`   From: ${sourceChain.name} (${sourceChainId})`);
    console.log(`   To: ${destChain.name} (${destChainId})`);
    console.log(`   User: ${userWallet}`);
    try {
        const custodyBalance = await chainClients_1.chainClientManager.getCustodyBalance(sourceChainId);
        console.log(`📊 Current custody balance on ${sourceChain.name}: ${custodyBalance.toString()} (need: ${amountAtomic.toString()})`);
        if (custodyBalance < amountAtomic) {
            console.log(`📤 Step 1: Moving funds from unified to custody on ${sourceChain.name}...`);
            const sourceChannelId = await callbacks.getOrCreateChannelForChain(sourceChainId);
            console.log(`   Using channel: ${sourceChannelId}`);
            const neededAmount = amountAtomic - custodyBalance;
            await callbacks.resizeChannelOnChain(sourceChannelId, -neededAmount, neededAmount, sourceChainId);
            console.log(`   Resized channel: moved ${Number(neededAmount) / 1000000} USDC to custody`);
        }
        else {
            console.log(`📤 Step 1: Skipped - sufficient funds already in custody`);
        }
        console.log(`📤 Step 2: Withdrawing from custody on ${sourceChain.name}...`);
        await chainClients_1.chainClientManager.withdrawFromCustody(sourceChainId, amountAtomic);
        console.log(`🌉 Step 3: Bridging via CCTP to ${userWallet} on ${destChain.name}...`);
        const bridgeResult = await bridgeUSDC({
            sourceChainId,
            destChainId,
            amount: amountFloat.toString(),
            recipientAddress: userWallet,
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
    }
    catch (error) {
        console.error('❌ Cross-chain withdrawal failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
//# sourceMappingURL=cctp.js.map