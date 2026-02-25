"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transfer = transfer;
const websockets_1 = require("../../lib/websockets");
async function transfer(params) {
    const result = await websockets_1.webSocketService.transfer(params.destination, params.allocations);
    console.log(`✅ Transfer completed to: ${params.destination}`);
    return result;
}
//# sourceMappingURL=transfer.js.map