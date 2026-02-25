"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAppState = submitAppState;
const websockets_1 = require("../../lib/websockets");
const nitrolite_1 = require("@erc7824/nitrolite");
async function submitAppState(params) {
    const intentMap = {
        operate: nitrolite_1.RPCAppStateIntent.Operate,
        deposit: nitrolite_1.RPCAppStateIntent.Deposit,
        withdraw: nitrolite_1.RPCAppStateIntent.Withdraw,
    };
    const intent = params.intent ? intentMap[params.intent] : nitrolite_1.RPCAppStateIntent.Operate;
    const result = await websockets_1.webSocketService.submitAppState(params.appSessionId, params.allocations, intent, params.sessionData);
    console.log(`✅ App state submitted for session: ${params.appSessionId}`);
    if (params.sessionData) {
        console.log(`   Payload included: ${JSON.stringify(params.sessionData)}`);
    }
    return result;
}
//# sourceMappingURL=submitState.js.map