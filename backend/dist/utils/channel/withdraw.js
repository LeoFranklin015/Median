"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawFromCustody = withdrawFromCustody;
const viem_1 = require("viem");
const websockets_1 = require("../../lib/websockets");
const config_1 = require("../../lib/config");
const USDC_DECIMALS = 6;
async function withdrawFromCustody(amount) {
    await websockets_1.webSocketService.waitForAuth();
    const nitroliteClient = websockets_1.webSocketService.getNitroliteClient();
    if (!nitroliteClient) {
        throw new Error('NitroliteClient not initialized');
    }
    const withdrawAmountInUnits = (0, viem_1.parseUnits)(amount, USDC_DECIMALS);
    console.log(`💸 Withdrawing ${amount} USDC (${withdrawAmountInUnits} units) from custody...`);
    const withdrawHash = await nitroliteClient.withdrawal(config_1.USDC_TOKEN, withdrawAmountInUnits);
    console.log(`✅ Withdraw tx hash: ${withdrawHash}`);
    return withdrawHash;
}
//# sourceMappingURL=withdraw.js.map