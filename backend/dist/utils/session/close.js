"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAppSession = closeAppSession;
const websockets_1 = require("../../lib/websockets");
async function closeAppSession(params) {
    const result = await websockets_1.webSocketService.closeAppSession(params.appSessionId, params.allocations);
    console.log(`✅ App session closed: ${params.appSessionId}`);
    return result;
}
//# sourceMappingURL=close.js.map