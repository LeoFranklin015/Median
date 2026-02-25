"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChannelOnChain = createChannelOnChain;
const websockets_1 = require("../../lib/websockets");
async function createChannelOnChain() {
    const result = await websockets_1.webSocketService.createChannelOnChain();
    console.log(`✅ Channel ${result.channelId} created on-chain (tx: ${result.txHash})`);
    return result;
}
//# sourceMappingURL=create.js.map