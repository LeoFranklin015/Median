"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeChannelOnChain = closeChannelOnChain;
const websockets_1 = require("../../lib/websockets");
async function closeChannelOnChain(channelId) {
    const result = await websockets_1.webSocketService.closeChannelOnChain(channelId);
    console.log(`✅ Channel ${channelId} closed on-chain (tx: ${result.txHash})`);
    return result;
}
//# sourceMappingURL=close.js.map