"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppSession = createAppSession;
const websockets_1 = require("../../lib/websockets");
async function createAppSession(params) {
    const result = await websockets_1.webSocketService.createAppSession(params.participants, params.allocations, params.applicationName || 'Median App');
    console.log(`✅ App session created: ${result.appSessionId}`);
    return result;
}
//# sourceMappingURL=create.js.map