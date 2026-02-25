"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const websockets_1 = require("./lib/websockets");
const create_1 = require("./utils/channel/create");
const close_1 = require("./utils/channel/close");
const resize_1 = require("./utils/channel/resize");
const deposit_1 = require("./utils/channel/deposit");
const withdraw_1 = require("./utils/channel/withdraw");
const create_2 = require("./utils/session/create");
const submitState_1 = require("./utils/session/submitState");
const close_2 = require("./utils/session/close");
const transfer_1 = require("./utils/session/transfer");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API' });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        websocket: websockets_1.webSocketService.getStatus(),
        authenticated: websockets_1.webSocketService.isAuthenticated(),
    });
});
const accounts_1 = require("viem/accounts");
app.get('/ws/status', (req, res) => {
    let privateKey = process.env.PRIVATE_KEY || '';
    if (privateKey && !privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}`;
    }
    const wallet = privateKey ? (0, accounts_1.privateKeyToAccount)(privateKey) : null;
    res.json({
        status: websockets_1.webSocketService.getStatus(),
        authenticated: websockets_1.webSocketService.isAuthenticated(),
        sessionKey: websockets_1.webSocketService.getSessionKey()?.address || null,
        walletAddress: wallet?.address || null
    });
});
app.post('/channels/onchain', async (req, res) => {
    try {
        const result = await (0, create_1.createChannelOnChain)();
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Failed to create channel on-chain:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/channels/close', async (req, res) => {
    try {
        const { channelId } = req.body;
        if (!channelId || !channelId.startsWith('0x')) {
            res.status(400).json({ success: false, error: 'Invalid channelId. Provide a hex string starting with 0x.' });
            return;
        }
        const result = await (0, close_1.closeChannelOnChain)(channelId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Failed to close channel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/channels/resize', async (req, res) => {
    try {
        const { channelId, resizeAmount, allocateAmount } = req.body;
        if (!channelId || !channelId.startsWith('0x')) {
            res.status(400).json({ success: false, error: 'Invalid channelId. Provide a hex string starting with 0x.' });
            return;
        }
        if (resizeAmount === undefined && allocateAmount === undefined) {
            res.status(400).json({ success: false, error: 'At least one of resizeAmount or allocateAmount must be provided.' });
            return;
        }
        const result = await (0, resize_1.resizeChannelOnChain)(channelId, resizeAmount, allocateAmount);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Failed to resize channel:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/deposit', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            res.status(400).json({ success: false, error: 'Invalid amount. Provide a positive number.' });
            return;
        }
        const txHash = await (0, deposit_1.depositToCustody)(amount.toString());
        res.json({ success: true, txHash });
    }
    catch (error) {
        console.error('Failed to deposit:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/withdraw', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            res.status(400).json({ success: false, error: 'Invalid amount. Provide a positive number.' });
            return;
        }
        const txHash = await (0, withdraw_1.withdrawFromCustody)(amount.toString());
        res.json({ success: true, txHash });
    }
    catch (error) {
        console.error('Failed to withdraw:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/sessions', async (req, res) => {
    try {
        const { participants, allocations, applicationName } = req.body;
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            res.status(400).json({ success: false, error: 'participants array is required.' });
            return;
        }
        if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
            res.status(400).json({ success: false, error: 'allocations array is required.' });
            return;
        }
        const result = await (0, create_2.createAppSession)({ participants, allocations, applicationName });
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Failed to create app session:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/sessions/:id/state', async (req, res) => {
    try {
        const appSessionId = req.params.id;
        const { allocations, sessionData, intent } = req.body;
        if (!appSessionId.startsWith('0x')) {
            res.status(400).json({ success: false, error: 'Invalid appSessionId. Provide a hex string starting with 0x.' });
            return;
        }
        if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
            res.status(400).json({ success: false, error: 'allocations array is required.' });
            return;
        }
        if (intent && !['operate', 'deposit', 'withdraw'].includes(intent)) {
            res.status(400).json({ success: false, error: 'Invalid intent. Use: operate, deposit, or withdraw.' });
            return;
        }
        const result = await (0, submitState_1.submitAppState)({ appSessionId, allocations, sessionData, intent });
        res.json(result);
    }
    catch (error) {
        console.error('Failed to submit app state:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/sessions/:id/close', async (req, res) => {
    try {
        const appSessionId = req.params.id;
        const { allocations } = req.body;
        if (!appSessionId.startsWith('0x')) {
            res.status(400).json({ success: false, error: 'Invalid appSessionId. Provide a hex string starting with 0x.' });
            return;
        }
        if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
            res.status(400).json({ success: false, error: 'allocations array is required.' });
            return;
        }
        const result = await (0, close_2.closeAppSession)({ appSessionId, allocations });
        res.json(result);
    }
    catch (error) {
        console.error('Failed to close app session:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/transfer', async (req, res) => {
    try {
        const { destination, allocations } = req.body;
        if (!destination || !destination.startsWith('0x')) {
            res.status(400).json({ success: false, error: 'Invalid destination. Provide a hex address starting with 0x.' });
            return;
        }
        if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
            res.status(400).json({ success: false, error: 'allocations array is required (e.g., [{ asset: "usdc", amount: "0.001" }]).' });
            return;
        }
        const result = await (0, transfer_1.transfer)({ destination, allocations });
        res.json(result);
    }
    catch (error) {
        console.error('Failed to transfer:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log('WebSocket service will connect automatically...');
});
//# sourceMappingURL=index.js.map