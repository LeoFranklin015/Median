"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const nitrolite_1 = require("@erc7824/nitrolite");
const sessionStore_1 = require("./sessionStore");
const config_1 = __importStar(require("./config"));
const cctp_1 = require("./cctp");
const chainClients_1 = require("./chainClients");
const getWallet = () => {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('PRIVATE_KEY environment variable is not set');
    }
    return (0, accounts_1.privateKeyToAccount)(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
};
class WebSocketService {
    constructor() {
        this.socket = null;
        this.status = 'Disconnected';
        this.statusListeners = new Set();
        this.messageListeners = new Set();
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.sessionKey = null;
        this.sessionSigner = null;
        this.walletClient = null;
        this.publicClient = null;
        this.authResolvers = [];
        this.channelResolvers = new Map();
        this.closeChannelResolvers = new Map();
        this.resizeChannelResolvers = new Map();
        this.appSessionResolvers = new Map();
        this.submitAppStateResolvers = new Map();
        this.closeAppSessionResolvers = new Map();
        this.getAppSessionsResolvers = new Map();
        this.transferResolvers = new Map();
        this.channelIdsByChain = new Map();
        this.initialize();
    }
    async initialize() {
        try {
            const wallet = getWallet();
            this.walletClient = (0, viem_1.createWalletClient)({
                account: wallet,
                chain: chains_1.base,
                transport: (0, viem_1.http)(config_1.ALCHEMY_RPC_URL),
            });
            this.publicClient = (0, viem_1.createPublicClient)({
                chain: chains_1.base,
                transport: (0, viem_1.http)(config_1.ALCHEMY_RPC_URL),
            });
            this.sessionKey = (0, sessionStore_1.generateSessionKey)();
            this.sessionSigner = (0, nitrolite_1.createECDSAMessageSigner)(this.sessionKey.privateKey);
            console.log('🔧 WebSocket service initialized');
            console.log(`📍 Wallet address: ${wallet.address}`);
            console.log(`🔑 Session key: ${this.sessionKey.address}`);
            this.connect();
        }
        catch (error) {
            console.error('❌ Failed to initialize WebSocket service:', error);
        }
    }
    connect() {
        if (this.socket && this.socket.readyState < 2)
            return;
        const wsUrl = process.env.YELLOW_NODE_URL;
        if (!wsUrl) {
            console.error('YELLOW_NODE_URL is not set');
            this.updateStatus('Disconnected');
            return;
        }
        console.log('🔌 Connecting to Yellow clearnet...');
        this.updateStatus('Connecting');
        this.socket = new WebSocket(wsUrl);
        this.socket.onopen = () => {
            console.log('🔌 WebSocket Connected');
            this.updateStatus('Connected');
            this.reconnectAttempts = 0;
            this.messageQueue.forEach((msg) => this.socket?.send(msg));
            this.messageQueue = [];
            this.startAuthentication();
        };
        this.socket.onmessage = (event) => {
            try {
                console.log('📩 Raw message received:', event.data);
                const data = (0, nitrolite_1.parseAnyRPCResponse)(event.data);
                const rawMessage = JSON.parse(event.data);
                const method = (0, nitrolite_1.getMethod)(rawMessage);
                console.log('📩 Parsed message method:', method);
                console.log('📩 Parsed data:', data);
                this.handleMessage(data, method);
                this.messageListeners.forEach((listener) => listener(data));
            }
            catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        this.socket.onclose = () => {
            console.log('🔌 WebSocket Disconnected');
            this.updateStatus('Disconnected');
            this.scheduleReconnect();
        };
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('Disconnected');
        };
    }
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnect attempts reached');
            this.authResolvers.forEach(({ reject }) => reject(new Error('Max reconnect attempts reached')));
            this.authResolvers = [];
            return;
        }
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), delay);
    }
    async startAuthentication() {
        if (!this.sessionKey || !this.walletClient) {
            console.error('❌ Cannot authenticate: session key or wallet not initialized');
            return;
        }
        const wallet = getWallet();
        const sessionExpireTimestamp = BigInt(Math.floor(Date.now() / 1000) + config_1.SESSION_DURATION);
        const authMessage = await (0, nitrolite_1.createAuthRequestMessage)({
            address: wallet.address,
            session_key: this.sessionKey.address,
            application: config_1.AUTH_SCOPE,
            allowances: config_1.AUTH_ALLOWANCES,
            expires_at: sessionExpireTimestamp,
            scope: 'median.app',
        });
        console.log('📤 Sending auth request...');
        this.send(authMessage);
    }
    async handleMessage(message, method) {
        const messageMethod = method || message.method;
        console.log('🔄 Handling message with method:', messageMethod);
        switch (messageMethod) {
            case nitrolite_1.RPCMethod.AuthChallenge:
            case 'auth_challenge':
                await this.handleAuthChallenge(message);
                break;
            case nitrolite_1.RPCMethod.AuthVerify:
            case 'auth_verify':
                this.handleAuthVerify(message);
                break;
            case nitrolite_1.RPCMethod.CreateChannel:
            case 'create_channel':
                this.handleCreateChannel(message);
                break;
            case nitrolite_1.RPCMethod.CloseChannel:
            case 'close_channel':
                this.handleCloseChannel(message);
                break;
            case nitrolite_1.RPCMethod.ResizeChannel:
            case 'resize_channel':
                this.handleResizeChannel(message);
                break;
            case nitrolite_1.RPCMethod.CreateAppSession:
            case 'create_app_session':
                this.handleCreateAppSession(message);
                break;
            case nitrolite_1.RPCMethod.SubmitAppState:
            case 'submit_app_state':
                this.handleSubmitAppState(message);
                break;
            case 'asu':
                this.handleAppStateUpdate(message);
                break;
            case nitrolite_1.RPCMethod.CloseAppSession:
            case 'close_app_session':
                this.handleCloseAppSession(message);
                break;
            case nitrolite_1.RPCMethod.GetAppSessions:
            case 'get_app_sessions':
                this.handleGetAppSessions(message);
                break;
            case nitrolite_1.RPCMethod.Transfer:
            case 'transfer':
            case 'tr':
                this.handleTransfer(message);
                break;
            case nitrolite_1.RPCMethod.Error:
            case 'error':
                console.error('❌ RPC Error:', message.params);
                if (message.params &&
                    typeof message.params.error === 'string' &&
                    message.params.error.includes('invalid challenge or signature')) {
                    console.log('🔄 Invalid challenge or signature — retrying authentication in 5 seconds...');
                    setTimeout(() => this.startAuthentication(), 5000);
                    break;
                }
                this.channelResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.channelResolvers.clear();
                this.closeChannelResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.closeChannelResolvers.clear();
                this.resizeChannelResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.resizeChannelResolvers.clear();
                this.appSessionResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.appSessionResolvers.clear();
                this.submitAppStateResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.submitAppStateResolvers.clear();
                this.closeAppSessionResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.closeAppSessionResolvers.clear();
                this.getAppSessionsResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.getAppSessionsResolvers.clear();
                this.transferResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.transferResolvers.clear();
                break;
            default:
                console.log('📩 Unhandled message method:', messageMethod);
                break;
        }
    }
    async handleAuthChallenge(message) {
        console.log('🔐 Received auth challenge');
        if (!this.sessionKey || !this.walletClient) {
            console.error('❌ Cannot handle auth challenge: missing session key or wallet');
            return;
        }
        const wallet = getWallet();
        const sessionExpireTimestamp = BigInt(Math.floor(Date.now() / 1000) + config_1.SESSION_DURATION);
        const authParams = {
            scope: 'median.app',
            application: wallet.address,
            participant: this.sessionKey.address,
            expire: sessionExpireTimestamp,
            allowances: config_1.AUTH_ALLOWANCES,
            session_key: this.sessionKey.address,
            expires_at: sessionExpireTimestamp,
        };
        const eip712Signer = (0, nitrolite_1.createEIP712AuthMessageSigner)(this.walletClient, authParams, { name: config_1.AUTH_SCOPE });
        const authVerifyMessage = await (0, nitrolite_1.createAuthVerifyMessage)(eip712Signer, message);
        console.log('📤 Sending auth verification...');
        this.send(authVerifyMessage);
    }
    handleAuthVerify(message) {
        const params = message.params;
        if (params.success) {
            console.log('✅ Authentication successful');
            this.updateStatus('Authenticated');
            this.authResolvers.forEach(({ resolve }) => resolve());
            this.authResolvers = [];
        }
        else {
            console.error('❌ Authentication failed:', message.params);
            this.authResolvers.forEach(({ reject }) => reject(new Error('Authentication failed')));
            this.authResolvers = [];
        }
    }
    handleCreateChannel(message) {
        console.log('🧬 Channel created successfully!');
        console.log('\n📋 Channel Details:');
        console.log('Channel', message);
        const params = message.params;
        console.log("Participants", params.channel?.participants);
        this.channelResolvers.forEach(({ resolve }) => resolve(message.params));
        this.channelResolvers.clear();
    }
    handleCloseChannel(message) {
        console.log('🔒 Close channel approved by server!');
        console.log('Close channel response:', message);
        this.closeChannelResolvers.forEach(({ resolve }) => resolve(message.params));
        this.closeChannelResolvers.clear();
    }
    handleResizeChannel(message) {
        console.log('📐 Resize channel approved by server!');
        console.log('Resize channel response:', message);
        this.resizeChannelResolvers.forEach(({ resolve }) => resolve(message.params));
        this.resizeChannelResolvers.clear();
    }
    handleCreateAppSession(message) {
        console.log('🎮 App session created successfully!');
        console.log('App session response:', message);
        this.appSessionResolvers.forEach(({ resolve }) => resolve(message.params));
        this.appSessionResolvers.clear();
    }
    handleSubmitAppState(message) {
        console.log('📊 App state submitted successfully!');
        console.log('Submit app state response:', message);
        this.submitAppStateResolvers.forEach(({ resolve }) => resolve(message.params));
        this.submitAppStateResolvers.clear();
    }
    handleCloseAppSession(message) {
        console.log('🏁 App session closed successfully!');
        console.log('Close app session response:', message);
        this.closeAppSessionResolvers.forEach(({ resolve }) => resolve(message.params));
        this.closeAppSessionResolvers.clear();
    }
    handleGetAppSessions(message) {
        console.log('📋 App sessions retrieved successfully!');
        console.log('Get app sessions response:', message);
        this.getAppSessionsResolvers.forEach(({ resolve }) => resolve(message.params));
        this.getAppSessionsResolvers.clear();
    }
    async handleAppStateUpdate(message) {
        console.log('🔄 Received App State Update (asu)');
        const params = message.params;
        if (!params.sessionData)
            return;
        try {
            const sessionData = JSON.parse(params.sessionData);
            console.log('📦 Processing session data:', sessionData);
            if (sessionData.action === 'crossChainWithdrawal' && sessionData.status !== 'completed' && sessionData.status !== 'failed') {
                await this.handleCrossChainWithdrawal(params, sessionData);
                return;
            }
            const isPerpetual = sessionData.positionId && sessionData.tradePair;
            if (isPerpetual) {
                if (sessionData.status === "filled" || sessionData.status === "closed") {
                    console.log('📦 Skipping already processed perpetual state:', sessionData.status);
                    return;
                }
                if (sessionData.action === "open") {
                    await this.handleOpenPerpPosition(params, sessionData);
                    return;
                }
                if (sessionData.action === "close" && sessionData.entryPrice !== undefined) {
                    await this.handleClosePerpPosition(params, sessionData);
                    return;
                }
                console.log('📦 Unhandled perpetual action:', sessionData.action);
                return;
            }
            if (sessionData.action && !sessionData.executionStatus) {
                console.log('🤖 Detected spot trade action, executing...');
                const market = sessionData.market;
                if (!market) {
                    console.log('📦 No market field, skipping spot trade processing');
                    return;
                }
                const [targetTicker, paymentTicker] = market.split('/');
                const paymentAsset = sessionData.paymentAsset || paymentTicker;
                console.log(`🔄 Processing ${market} trade (${targetTicker} with ${paymentAsset})`);
                const targetPrice = await this.fetchPrice(targetTicker);
                if (!targetPrice || targetPrice <= 0) {
                    console.error(`❌ Unable to fetch valid price for ${targetTicker}`);
                    return;
                }
                console.log(`📈 Target price for ${targetTicker}: $${targetPrice}`);
                let paymentPrice = 1.0;
                if (paymentAsset.toUpperCase() !== 'USDC') {
                    paymentPrice = await this.fetchPrice(paymentAsset);
                    if (!paymentPrice || paymentPrice <= 0) {
                        console.error(`❌ Unable to fetch valid price for ${paymentAsset}`);
                        return;
                    }
                }
                console.log(`📈 Payment price for ${paymentAsset}: $${paymentPrice}`);
                const payAmountAtomic = BigInt(sessionData.payAmountAtomic || sessionData.amount || '0');
                const decimals = paymentAsset.toUpperCase() === 'USDC' ? 6 : 18;
                const payAmount = Number(payAmountAtomic) / Math.pow(10, decimals);
                const payValueUSD = payAmount * paymentPrice;
                const targetStockQty = payValueUSD / targetPrice;
                console.log(`🔄 Stock-for-Stock Trade Calculation:`);
                console.log(`   Paying: ${payAmount} ${paymentAsset} @ $${paymentPrice}`);
                console.log(`   Value: $${payValueUSD}`);
                console.log(`   Receiving: ${targetStockQty} ${targetTicker} @ $${targetPrice}`);
                const executionData = {
                    ...sessionData,
                    executionStatus: 'filled',
                    paymentAsset: paymentAsset,
                    paymentPrice: paymentPrice,
                    paymentAmount: payAmount,
                    filledPrice: targetPrice,
                    filledQuantity: targetStockQty,
                    totalValueUSD: payValueUSD,
                    timestamp: Date.now()
                };
                const appSessionId = params.appSessionId;
                const allocations = params.participantAllocations?.map((p) => ({
                    participant: p.participant,
                    asset: p.asset,
                    amount: p.amount
                })) || [];
                await this.submitAppState(appSessionId, allocations, nitrolite_1.RPCAppStateIntent.Operate, executionData);
            }
        }
        catch (error) {
            console.error('❌ Error processing AS update:', error);
        }
    }
    async fetchPrice(ticker) {
        const upperTicker = ticker.toUpperCase();
        const cryptoTickers = ['BTC', 'ETH', 'SOL', 'LINK', 'SUI', 'DOGE', 'XRP', 'AVAX', 'ATOM', 'ADA', 'DOT', 'LTC', 'ARB', 'OP', 'PEPE', 'WIF', 'BONK', 'SEI', 'APT', 'FIL', 'NEAR', 'INJ', 'TIA'];
        const isCrypto = cryptoTickers.includes(upperTicker);
        if (isCrypto) {
            try {
                const symbol = `${upperTicker}USDT`;
                const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
                const data = await response.json();
                const price = parseFloat(data.result?.list?.[0]?.lastPrice || '0');
                if (price > 0) {
                    console.log(`📈 Bybit price for ${ticker}: $${price}`);
                    return price;
                }
            }
            catch (err) {
                console.error('Failed to fetch Bybit price:', err);
            }
        }
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) {
            console.error('❌ FINNHUB_API_KEY is not set in environment variables');
        }
        else {
            try {
                const url = `https://finnhub.io/api/v1/quote?symbol=${upperTicker}&token=${apiKey}`;
                console.log(`🔍 Fetching Finnhub quote for ${upperTicker}...`);
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`❌ Finnhub API error: ${response.status} ${response.statusText}`);
                }
                else {
                    const data = await response.json();
                    console.log(`📊 Finnhub response for ${upperTicker}:`, JSON.stringify(data));
                    if (data.c > 0) {
                        console.log(`📈 Finnhub price for ${upperTicker}: $${data.c}`);
                        return data.c;
                    }
                    else {
                        console.warn(`⚠️ Finnhub returned zero/null price for ${upperTicker}`);
                    }
                }
            }
            catch (err) {
                console.error('Failed to fetch Finnhub price:', err);
            }
        }
        console.warn(`⚠️ Could not fetch price for ${ticker}, using mock price $100`);
        return 100;
    }
    async handleOpenPerpPosition(params, sessionData) {
        console.log('📈 Processing OPEN perpetual position:', sessionData.positionId);
        const ticker = sessionData.ticker;
        const leverage = sessionData.leverage;
        const amountAtomic = parseInt(sessionData.amount);
        const collateral = amountAtomic / 1000000;
        const positionType = sessionData.type;
        const entryPrice = await this.fetchPrice(ticker);
        const positionSize = (collateral * leverage) / entryPrice;
        const maintenanceMargin = 0.005;
        const liquidationPrice = positionType === "long"
            ? entryPrice * (1 - (1 / leverage) + maintenanceMargin)
            : entryPrice * (1 + (1 / leverage) - maintenanceMargin);
        const filledData = {
            ...sessionData,
            status: "filled",
            entryPrice,
            positionSize,
            liquidationPrice,
            filledAt: Date.now()
        };
        const appSessionId = params.appSessionId;
        const allocations = params.participantAllocations?.map((p) => ({
            participant: p.participant,
            asset: p.asset,
            amount: p.amount
        })) || [];
        await this.submitAppState(appSessionId, allocations, nitrolite_1.RPCAppStateIntent.Operate, filledData);
        console.log(`✅ Position ${sessionData.positionId} filled at $${entryPrice}`);
    }
    async handleClosePerpPosition(params, sessionData) {
        console.log('📉 Processing CLOSE perpetual position:', sessionData.positionId);
        const ticker = sessionData.ticker;
        const leverage = sessionData.leverage;
        const amountAtomic = parseInt(sessionData.amount);
        const collateral = amountAtomic / 1000000;
        const positionType = sessionData.type;
        const entryPrice = sessionData.entryPrice;
        const userWallet = sessionData.userWallet;
        const exitPrice = await this.fetchPrice(ticker);
        let priceChange = 0;
        let pnl = 0;
        let pnlPercent = 0;
        if (entryPrice > 0) {
            priceChange = positionType === "long"
                ? (exitPrice - entryPrice) / entryPrice
                : (entryPrice - exitPrice) / entryPrice;
            pnl = collateral * leverage * priceChange;
            pnlPercent = priceChange * leverage * 100;
        }
        else {
            console.warn('⚠️ Entry price is 0, cannot calculate PnL');
        }
        const returnAmount = Math.max(0, collateral + pnl);
        const returnAmountAtomic = Math.floor(returnAmount * 1000000).toString();
        console.log(`🧮 PnL Calculation:`);
        console.log(`   Entry: $${entryPrice}, Exit: $${exitPrice}`);
        console.log(`   Price change: ${(priceChange * 100).toFixed(2)}%`);
        console.log(`   Leveraged PnL: ${pnlPercent.toFixed(2)}%`);
        console.log(`   Collateral: $${collateral}, PnL: $${pnl.toFixed(2)}`);
        console.log(`   Return: $${returnAmount.toFixed(2)}`);
        const closedData = {
            ...sessionData,
            status: "closed",
            exitPrice,
            pnl: pnl.toFixed(2),
            pnlPercent: pnlPercent.toFixed(2),
            returnAmount: returnAmountAtomic,
            closedAt: Date.now()
        };
        const appSessionId = params.appSessionId;
        const allocations = params.participantAllocations?.map((p) => ({
            participant: p.participant,
            asset: p.asset,
            amount: p.amount
        })) || [];
        await this.submitAppState(appSessionId, allocations, nitrolite_1.RPCAppStateIntent.Operate, closedData);
        if (returnAmount > 0) {
            console.log(`💸 Transferring $${returnAmount.toFixed(2)} USDC to ${userWallet}`);
            await this.transfer(userWallet, [
                {
                    asset: 'usdc',
                    amount: returnAmount.toString()
                }
            ]);
        }
        console.log(`✅ Position ${sessionData.positionId} closed. PnL: $${pnl.toFixed(2)}`);
    }
    async handleCrossChainWithdrawal(params, sessionData) {
        console.log('🌉 Processing cross-chain withdrawal...');
        console.log('   Session data:', JSON.stringify(sessionData, null, 2));
        const { sourceChainId, destChainId, amount, userWallet } = sessionData;
        const result = await (0, cctp_1.performCrossChainWithdrawal)({ sourceChainId, destChainId, amount, userWallet }, {
            getOrCreateChannelForChain: this.getOrCreateChannelForChain.bind(this),
            resizeChannelOnChain: this.resizeChannelOnChain.bind(this),
        });
        if (result.success) {
            console.log(`✅ Cross-chain withdrawal complete!`);
            await this.updateCrossChainStatus(params, sessionData, 'completed', undefined, result.txHash);
        }
        else {
            console.error('❌ Cross-chain withdrawal failed:', result.error);
            await this.updateCrossChainStatus(params, sessionData, 'failed', result.error);
        }
    }
    async updateCrossChainStatus(params, sessionData, status, error, bridgeTxHash) {
        const updatedData = {
            ...sessionData,
            status,
            ...(error && { error }),
            ...(bridgeTxHash && { bridgeTxHash }),
            updatedAt: Date.now(),
        };
        const allocations = params.participantAllocations?.map((p) => ({
            participant: p.participant,
            asset: p.asset,
            amount: p.amount
        })) || [];
        await this.submitAppState(params.appSessionId, allocations, nitrolite_1.RPCAppStateIntent.Operate, updatedData);
    }
    async handleTransfer(message) {
        console.log('💸 Transfer received!');
        console.log('Transfer response:', JSON.stringify(message, null, 2));
        this.transferResolvers.forEach(({ resolve }) => resolve(message.params));
        this.transferResolvers.clear();
        try {
            const params = message.params;
            const transactions = params.transactions || [];
            if (transactions.length === 0) {
                console.log('📋 No transactions in transfer message, skipping response');
                return;
            }
            const transaction = transactions[0];
            const senderAddress = transaction.fromAccount || transaction.from_account;
            const receivedAsset = transaction.asset || 'USDC';
            const receivedAmount = transaction.amount;
            if (!senderAddress) {
                console.log('📋 No sender address found in transfer message, skipping response');
                return;
            }
            const wallet = getWallet();
            if (senderAddress.toLowerCase() === wallet.address.toLowerCase()) {
                console.log('📋 Transfer is outgoing, no response needed');
                return;
            }
            console.log(`📋 Received ${receivedAmount} ${receivedAsset} from ${senderAddress}`);
            const sessions = await this.getAppSessions();
            let matchingSession = null;
            let sessionData = null;
            for (const session of sessions) {
                const sessionObj = session;
                const participants = sessionObj.participants || [];
                const isParticipant = participants.some((p) => p.toLowerCase() === senderAddress.toLowerCase());
                const rawSessionData = sessionObj.session_data || sessionObj.sessionData;
                if (rawSessionData) {
                    try {
                        const data = typeof rawSessionData === 'string'
                            ? JSON.parse(rawSessionData)
                            : rawSessionData;
                        const expectedPaymentAsset = data.paymentAsset || 'USDC';
                        if (data.executionStatus === 'filled' &&
                            expectedPaymentAsset.toUpperCase() === receivedAsset.toUpperCase() &&
                            isParticipant) {
                            matchingSession = session;
                            sessionData = data;
                            console.log(`📋 Found matching session: ${sessionObj.appSessionId}`);
                            console.log(`   Expected: ${expectedPaymentAsset}, Received: ${receivedAsset}`);
                            console.log(`   Market: ${data.market}`);
                            break;
                        }
                    }
                    catch (e) {
                        console.log('📋 Could not parse session_data:', e);
                    }
                }
            }
            if (!matchingSession || !sessionData) {
                console.log('📋 No matching session found for this transfer');
                return;
            }
            const market = sessionData.market || 'AAPL/USDC';
            const targetTicker = market.split('/')[0].toUpperCase();
            const targetAmount = String(sessionData.filledQuantity);
            console.log(`💸 Sending ${targetAmount} ${targetTicker} to ${senderAddress}`);
            await this.transfer(senderAddress, [
                {
                    asset: targetTicker,
                    amount: targetAmount
                }
            ]);
            console.log(`✅ Trade completed: ${receivedAmount} ${receivedAsset} → ${targetAmount} ${targetTicker}`);
        }
        catch (error) {
            console.error('❌ Error processing transfer and sending tokens:', error);
        }
    }
    send(payload) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(payload);
        }
        else {
            this.messageQueue.push(payload);
        }
    }
    updateStatus(newStatus) {
        this.status = newStatus;
        this.statusListeners.forEach((listener) => listener(this.status));
    }
    getStatus() {
        return this.status;
    }
    isAuthenticated() {
        return this.status === 'Authenticated';
    }
    waitForAuth() {
        if (this.status === 'Authenticated') {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.authResolvers.push({ resolve, reject });
        });
    }
    async createChannel() {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        const createChannelMessage = await (0, nitrolite_1.createCreateChannelMessage)(this.sessionSigner, {
            chain_id: config_1.CHAIN_ID,
            token: config_1.USDC_TOKEN,
        });
        console.log('📤 Creating channel for USDC on Base...');
        return new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.channelResolvers.set(id, { resolve, reject });
            this.send(createChannelMessage);
            setTimeout(() => {
                if (this.channelResolvers.has(id)) {
                    this.channelResolvers.delete(id);
                    reject(new Error('Channel creation timeout'));
                }
            }, 30000);
        });
    }
    getNitroliteClient() {
        if (!this.walletClient || !this.publicClient) {
            return null;
        }
        return new nitrolite_1.NitroliteClient({
            walletClient: this.walletClient,
            publicClient: this.publicClient,
            stateSigner: new nitrolite_1.WalletStateSigner(this.walletClient),
            addresses: (0, config_1.default)(),
            chainId: config_1.CHAIN_ID,
            challengeDuration: 3600n,
        });
    }
    async createChannelOnChain() {
        const channelData = await this.createChannel();
        const nitroliteClient = this.getNitroliteClient();
        if (!nitroliteClient) {
            throw new Error('NitroliteClient not initialized');
        }
        const { channelId, txHash } = await nitroliteClient.createChannel({
            channel: channelData.channel,
            unsignedInitialState: {
                intent: channelData.state.intent,
                version: BigInt(channelData.state.version),
                data: channelData.state.stateData,
                allocations: channelData.state.allocations,
            },
            serverSignature: channelData.serverSignature,
        });
        console.log(`🧬 Channel ${channelId} created on-chain (tx: ${txHash})`);
        return { channelId, txHash };
    }
    async getOrCreateChannelForChain(chainId) {
        const existingChannelId = this.channelIdsByChain.get(chainId);
        if (existingChannelId) {
            console.log(`📋 Using existing channel for chain ${chainId}: ${existingChannelId}`);
            return existingChannelId;
        }
        const chainConfig = (0, config_1.getChainById)(chainId);
        if (!chainConfig) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        const createChannelViaWebSocket = async () => {
            console.log(`🧬 Creating channel for ${chainConfig.name} (${chainId})...`);
            const createChannelMessage = await (0, nitrolite_1.createCreateChannelMessage)(this.sessionSigner, {
                chain_id: chainId,
                token: chainConfig.usdcToken,
            });
            return new Promise((resolve, reject) => {
                const id = Date.now().toString();
                this.channelResolvers.set(id, { resolve, reject });
                this.send(createChannelMessage);
                setTimeout(() => {
                    if (this.channelResolvers.has(id)) {
                        this.channelResolvers.delete(id);
                        reject(new Error(`Channel creation timeout for chain ${chainId}`));
                    }
                }, 30000);
            });
        };
        let channelData;
        let channelId;
        let needsOnChainCreation = true;
        try {
            channelData = await createChannelViaWebSocket();
            channelId = channelData.channel?.channelId || channelData.channelId;
            if (!channelId) {
                throw new Error(`No channel ID in response for chain ${chainId}`);
            }
        }
        catch (error) {
            const errorStr = String(error);
            const existingChannelMatch = errorStr.match(/already exists: (0x[a-fA-F0-9]+)/);
            if (existingChannelMatch) {
                channelId = existingChannelMatch[1];
                console.log(`📋 Using existing channel with broker: ${channelId}`);
                needsOnChainCreation = false;
            }
            else {
                throw error;
            }
        }
        if (needsOnChainCreation && channelData) {
            console.log(`📝 Submitting channel ${channelId} to ${chainConfig.name} on-chain...`);
            const nitroliteClient = chainClients_1.chainClientManager.getNitroliteClient(chainId);
            const { txHash } = await nitroliteClient.createChannel({
                channel: channelData.channel,
                unsignedInitialState: {
                    intent: channelData.state.intent,
                    version: BigInt(channelData.state.version),
                    data: channelData.state.stateData,
                    allocations: channelData.state.allocations,
                },
                serverSignature: channelData.serverSignature,
            });
            console.log(`✅ Channel ${channelId} created on-chain on ${chainConfig.name} (tx: ${txHash})`);
            console.log(`⏳ Waiting 10 seconds for channel to be indexed...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        this.channelIdsByChain.set(chainId, channelId);
        return channelId;
    }
    async closeChannelOnChain(channelId) {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        const wallet = getWallet();
        console.log(`🔒 Requesting channel close for: ${channelId}`);
        const closeMessage = await (0, nitrolite_1.createCloseChannelMessage)(this.sessionSigner, channelId, wallet.address);
        const closeData = await new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.closeChannelResolvers.set(id, { resolve, reject });
            this.send(closeMessage);
            setTimeout(() => {
                if (this.closeChannelResolvers.has(id)) {
                    this.closeChannelResolvers.delete(id);
                    reject(new Error('Close channel timeout'));
                }
            }, 30000);
        });
        console.log('✅ Close approved by server, executing on-chain...');
        const nitroliteClient = this.getNitroliteClient();
        if (!nitroliteClient) {
            throw new Error('NitroliteClient not initialized');
        }
        const txHash = await nitroliteClient.closeChannel({
            finalState: {
                intent: closeData.state.intent,
                channelId: closeData.channelId,
                data: closeData.state.stateData,
                allocations: closeData.state.allocations,
                version: BigInt(closeData.state.version),
                serverSignature: closeData.serverSignature,
            },
            stateData: closeData.state.stateData,
        });
        console.log(`🔒 Channel ${channelId} closed on-chain (tx: ${txHash})`);
        return { txHash };
    }
    async resizeChannelOnChain(channelId, resizeAmount, allocateAmount, chainId) {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        const wallet = getWallet();
        const fundsDestination = wallet.address;
        console.log(`📐 Requesting channel resize for: ${channelId}`);
        if (resizeAmount !== undefined) {
            console.log(`   Resize amount: ${resizeAmount.toString()}`);
        }
        if (allocateAmount !== undefined) {
            console.log(`   Allocate amount: ${allocateAmount.toString()}`);
        }
        const attemptResize = async () => {
            const resizeMessage = await (0, nitrolite_1.createResizeChannelMessage)(this.sessionSigner, {
                channel_id: channelId,
                ...(resizeAmount !== undefined && { resize_amount: resizeAmount }),
                ...(allocateAmount !== undefined && { allocate_amount: allocateAmount }),
                funds_destination: fundsDestination,
            });
            return new Promise((resolve, reject) => {
                const id = Date.now().toString();
                this.resizeChannelResolvers.set(id, { resolve, reject });
                this.send(resizeMessage);
                setTimeout(() => {
                    if (this.resizeChannelResolvers.has(id)) {
                        this.resizeChannelResolvers.delete(id);
                        reject(new Error('Resize channel timeout'));
                    }
                }, 30000);
            });
        };
        let resizeData;
        try {
            resizeData = await attemptResize();
        }
        catch (error) {
            const errorStr = String(error);
            if (errorStr.includes('not found')) {
                console.log(`⏳ Channel not found, waiting 1 second and retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                resizeData = await attemptResize();
            }
            else {
                throw error;
            }
        }
        console.log('✅ Resize approved by server, executing on-chain...');
        const nitroliteClient = chainId
            ? chainClients_1.chainClientManager.getNitroliteClient(chainId)
            : this.getNitroliteClient();
        if (!nitroliteClient) {
            throw new Error('NitroliteClient not initialized');
        }
        const previousState = await nitroliteClient.getChannelData(channelId);
        console.log('📋 Previous state fetched for proof');
        const { txHash } = await nitroliteClient.resizeChannel({
            resizeState: {
                channelId: resizeData.channelId,
                intent: resizeData.state.intent,
                version: BigInt(resizeData.state.version),
                data: resizeData.state.stateData,
                allocations: resizeData.state.allocations,
                serverSignature: resizeData.serverSignature,
            },
            proofStates: [previousState.lastValidState],
        });
        console.log(`📐 Channel ${channelId} resized on-chain (tx: ${txHash})`);
        return { txHash };
    }
    async createAppSession(participants, allocations, applicationName = 'Median App') {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        console.log(`🎮 Creating app session for: ${applicationName}`);
        console.log(`   Participants: ${participants.join(', ')}`);
        const singleWeight = Math.floor(100 / participants.length);
        const definition = {
            protocol: nitrolite_1.RPCProtocolVersion.NitroRPC_0_4,
            participants: participants,
            weights: participants.map(() => singleWeight),
            quorum: singleWeight,
            challenge: 0,
            nonce: Date.now(),
            application: applicationName,
        };
        const rpcAllocations = allocations.map(a => ({
            participant: a.participant,
            asset: a.asset,
            amount: a.amount,
        }));
        const sessionMessage = await (0, nitrolite_1.createAppSessionMessage)(this.sessionSigner, {
            definition,
            allocations: rpcAllocations,
        });
        const sessionData = await new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.appSessionResolvers.set(id, { resolve, reject });
            this.send(sessionMessage);
            setTimeout(() => {
                if (this.appSessionResolvers.has(id)) {
                    this.appSessionResolvers.delete(id);
                    reject(new Error('Create app session timeout'));
                }
            }, 30000);
        });
        console.log(`🎮 App session created: ${sessionData.appSessionId}`);
        return { appSessionId: sessionData.appSessionId };
    }
    async submitAppState(appSessionId, allocations, intent = nitrolite_1.RPCAppStateIntent.Operate, sessionData) {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        const currentVersion = await this.getAppSessionVersion(appSessionId);
        const newVersion = currentVersion + 1;
        console.log(`📊 Submitting state update for session: ${appSessionId}`);
        console.log(`   Current version: ${currentVersion}, submitting version: ${newVersion}`);
        const rpcAllocations = allocations.map(a => ({
            participant: a.participant,
            asset: a.asset,
            amount: a.amount,
        }));
        const stateMessage = await (0, nitrolite_1.createSubmitAppStateMessage)(this.sessionSigner, {
            app_session_id: appSessionId,
            intent,
            version: newVersion,
            allocations: rpcAllocations,
            ...(sessionData && { session_data: JSON.stringify(sessionData) }),
        });
        await new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.submitAppStateResolvers.set(id, { resolve, reject });
            this.send(stateMessage);
            setTimeout(() => {
                if (this.submitAppStateResolvers.has(id)) {
                    this.submitAppStateResolvers.delete(id);
                    reject(new Error('Submit app state timeout'));
                }
            }, 30000);
        });
        console.log(`📊 App state updated for session: ${appSessionId}`);
        return { success: true };
    }
    async closeAppSession(appSessionId, allocations) {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        console.log(`🏁 Closing app session: ${appSessionId}`);
        const rpcAllocations = allocations.map(a => ({
            participant: a.participant,
            asset: a.asset,
            amount: a.amount,
        }));
        const closeMessage = await (0, nitrolite_1.createCloseAppSessionMessage)(this.sessionSigner, {
            app_session_id: appSessionId,
            allocations: rpcAllocations,
        });
        await new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.closeAppSessionResolvers.set(id, { resolve, reject });
            this.send(closeMessage);
            setTimeout(() => {
                if (this.closeAppSessionResolvers.has(id)) {
                    this.closeAppSessionResolvers.delete(id);
                    reject(new Error('Close app session timeout'));
                }
            }, 30000);
        });
        console.log(`🏁 App session closed: ${appSessionId}`);
        return { success: true };
    }
    async getAppSessions(participant, status) {
        await this.waitForAuth();
        const wallet = getWallet();
        const participantAddress = (participant || wallet.address);
        console.log(`📋 Getting app sessions for: ${participantAddress}${status ? ` (status: ${status})` : ' (all statuses)'}`);
        const getSessionsMessage = (0, nitrolite_1.createGetAppSessionsMessageV2)(participantAddress, status);
        const sessionsData = await new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.getAppSessionsResolvers.set(id, { resolve, reject });
            this.send(getSessionsMessage);
            setTimeout(() => {
                if (this.getAppSessionsResolvers.has(id)) {
                    this.getAppSessionsResolvers.delete(id);
                    reject(new Error('Get app sessions timeout'));
                }
            }, 30000);
        });
        console.log(`📋 Raw sessions response:`, JSON.stringify(sessionsData, null, 2));
        console.log(`📋 Found ${sessionsData.appSessions?.length || 0} app sessions`);
        return sessionsData.appSessions || [];
    }
    async getAppSessionVersion(appSessionId) {
        const sessions = await this.getAppSessions();
        console.log(`📋 Looking for session ${appSessionId} in ${sessions.length} sessions`);
        console.log(`📋 Available sessions:`, sessions.map((s) => ({ id: s.appSessionId, version: s.version })));
        const session = sessions.find((s) => s.appSessionId.toLowerCase() === appSessionId.toLowerCase());
        if (!session) {
            throw new Error(`App session not found: ${appSessionId}`);
        }
        return session.version;
    }
    async transfer(destination, allocations) {
        await this.waitForAuth();
        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }
        console.log(`💸 Initiating transfer to: ${destination}`);
        console.log(`   Allocations:`, allocations);
        const transferMessage = await (0, nitrolite_1.createTransferMessage)(this.sessionSigner, {
            destination: destination,
            allocations: allocations.map(a => ({
                asset: a.asset,
                amount: a.amount,
            })),
        });
        await new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.transferResolvers.set(id, { resolve, reject });
            this.send(transferMessage);
            setTimeout(() => {
                if (this.transferResolvers.has(id)) {
                    this.transferResolvers.delete(id);
                    reject(new Error('Transfer timeout'));
                }
            }, 30000);
        });
        console.log(`💸 Transfer completed to: ${destination}`);
        return { success: true };
    }
    addStatusListener(listener) {
        this.statusListeners.add(listener);
        listener(this.status);
    }
    removeStatusListener(listener) {
        this.statusListeners.delete(listener);
    }
    addMessageListener(listener) {
        this.messageListeners.add(listener);
    }
    removeMessageListener(listener) {
        this.messageListeners.delete(listener);
    }
    getSessionKey() {
        return this.sessionKey;
    }
}
exports.webSocketService = new WebSocketService();
//# sourceMappingURL=websockets.js.map