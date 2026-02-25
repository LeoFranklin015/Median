"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositToCustody = depositToCustody;
const viem_1 = require("viem");
const websockets_1 = require("../../lib/websockets");
const config_1 = require("../../lib/config");
const USDC_DECIMALS = 6;
async function depositToCustody(amount) {
    await websockets_1.webSocketService.waitForAuth();
    const nitroliteClient = websockets_1.webSocketService.getNitroliteClient();
    if (!nitroliteClient) {
        throw new Error('NitroliteClient not initialized');
    }
    const depositAmountInUnits = (0, viem_1.parseUnits)(amount, USDC_DECIMALS);
    console.log(`💰 Depositing ${amount} USDC (${depositAmountInUnits} units) to custody...`);
    const depositHash = await nitroliteClient.deposit(config_1.USDC_TOKEN, depositAmountInUnits);
    console.log(`✅ Deposit tx hash: ${depositHash}`);
    return depositHash;
}
//# sourceMappingURL=deposit.js.map