"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainClientManager = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const nitrolite_1 = require("@erc7824/nitrolite");
const config_1 = require("./config");
const viemChains = {
    8453: chains_1.base,
};
class ChainClientManager {
    constructor() {
        this.clients = new Map();
        this.wallet = null;
    }
    getWallet() {
        if (!this.wallet) {
            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey) {
                throw new Error('PRIVATE_KEY environment variable is not set');
            }
            this.wallet = (0, accounts_1.privateKeyToAccount)(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
        }
        return this.wallet;
    }
    getClients(chainId) {
        if (this.clients.has(chainId)) {
            return this.clients.get(chainId);
        }
        const chainConfig = (0, config_1.getChainById)(chainId);
        const viemChain = viemChains[chainId];
        if (!chainConfig) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }
        if (!viemChain) {
            throw new Error(`No viem chain definition for chain ID: ${chainId}`);
        }
        const wallet = this.getWallet();
        console.log(`🔧 Initializing clients for ${chainConfig.name} (${chainId})`);
        const publicClient = (0, viem_1.createPublicClient)({
            chain: viemChain,
            transport: (0, viem_1.http)(chainConfig.rpcUrl),
        });
        const walletClient = (0, viem_1.createWalletClient)({
            account: wallet,
            chain: viemChain,
            transport: (0, viem_1.http)(chainConfig.rpcUrl),
        });
        const nitroliteClient = new nitrolite_1.NitroliteClient({
            walletClient: walletClient,
            publicClient: publicClient,
            stateSigner: new nitrolite_1.WalletStateSigner(walletClient),
            addresses: {
                custody: chainConfig.custody,
                adjudicator: chainConfig.adjudicator,
            },
            chainId,
            challengeDuration: 3600n,
        });
        const clients = {
            publicClient: publicClient,
            walletClient: walletClient,
            nitroliteClient,
            config: chainConfig,
        };
        this.clients.set(chainId, clients);
        console.log(`✅ Clients initialized for ${chainConfig.name}`);
        return clients;
    }
    getNitroliteClient(chainId) {
        return this.getClients(chainId).nitroliteClient;
    }
    getWalletAddress() {
        return this.getWallet().address;
    }
    async getTokenAllowance(chainId) {
        const { nitroliteClient, config } = this.getClients(chainId);
        try {
            return await nitroliteClient.getTokenAllowance(config.usdcToken);
        }
        catch (error) {
            console.warn(`Failed to get allowance on chain ${chainId}:`, error);
            return 0n;
        }
    }
    async approveTokens(chainId, amount) {
        const { nitroliteClient, config } = this.getClients(chainId);
        console.log(`📝 Approving ${amount} USDC on ${config.name}...`);
        const hash = await nitroliteClient.approveTokens(config.usdcToken, amount);
        console.log(`✅ Approved on ${config.name}: ${hash}`);
        return hash;
    }
    async depositToCustody(chainId, amount) {
        const { nitroliteClient, config } = this.getClients(chainId);
        console.log(`📥 Depositing ${amount} USDC to custody on ${config.name}...`);
        const hash = await nitroliteClient.deposit(config.usdcToken, amount);
        console.log(`✅ Deposited on ${config.name}: ${hash}`);
        return hash;
    }
    async withdrawFromCustody(chainId, amount) {
        const { nitroliteClient, config } = this.getClients(chainId);
        console.log(`📤 Withdrawing ${amount} USDC from custody on ${config.name}...`);
        const hash = await nitroliteClient.withdrawal(config.usdcToken, amount);
        console.log(`✅ Withdrew on ${config.name}: ${hash}`);
        return hash;
    }
    async getCustodyBalance(chainId) {
        const { nitroliteClient, config } = this.getClients(chainId);
        try {
            return await nitroliteClient.getAccountBalance(config.usdcToken);
        }
        catch (error) {
            console.warn(`Failed to get custody balance on chain ${chainId}:`, error);
            return 0n;
        }
    }
}
exports.chainClientManager = new ChainClientManager();
//# sourceMappingURL=chainClients.js.map