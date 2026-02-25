"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resizeChannelOnChain = resizeChannelOnChain;
const viem_1 = require("viem");
const websockets_1 = require("../../lib/websockets");
const USDC_DECIMALS = 6;
async function resizeChannelOnChain(channelId, resizeAmount, allocateAmount) {
    const resizeAmountBigInt = resizeAmount !== undefined
        ? (0, viem_1.parseUnits)(resizeAmount, USDC_DECIMALS)
        : undefined;
    const allocateAmountBigInt = allocateAmount !== undefined
        ? (0, viem_1.parseUnits)(allocateAmount, USDC_DECIMALS)
        : undefined;
    const result = await websockets_1.webSocketService.resizeChannelOnChain(channelId, resizeAmountBigInt, allocateAmountBigInt);
    console.log(`✅ Channel ${channelId} resized on-chain (tx: ${result.txHash})`);
    return result;
}
//# sourceMappingURL=resize.js.map