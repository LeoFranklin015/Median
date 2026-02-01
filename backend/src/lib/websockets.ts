import { config } from 'dotenv';
config(); // Load env vars before anything else

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import {
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createCreateChannelMessage,
    createCloseChannelMessage,
    createEIP712AuthMessageSigner,
    createECDSAMessageSigner,
    AuthChallengeResponse,
    RPCMethod,
    RPCResponse,
    NitroliteClient,
    WalletStateSigner,
    Channel,
    StateIntent,
    Allocation,
    ContractAddresses,
    parseAnyRPCResponse,
    getMethod
} from '@erc7824/nitrolite';
import { generateSessionKey, SessionKey, storeSessionKey } from './sessionStore';
import getContractAddresses, {
    CHAIN_ID,
    USDC_TOKEN,
    AUTH_SCOPE,
    SESSION_DURATION,
    AUTH_ALLOWANCES
} from './config';

export type WsStatus = 'Connecting' | 'Connected' | 'Authenticated' | 'Disconnected';

type StatusListener = (status: WsStatus) => void;
type MessageListener = (data: RPCResponse) => void;

// Create wallet and clients from environment
const getWallet = () => {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('PRIVATE_KEY environment variable is not set');
    }
    return privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`);
};

class WebSocketService {
    private socket: WebSocket | null = null;
    private status: WsStatus = 'Disconnected';
    private statusListeners: Set<StatusListener> = new Set();
    private messageListeners: Set<MessageListener> = new Set();
    private messageQueue: string[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000;

    // Authentication state
    private sessionKey: SessionKey | null = null;
    private sessionSigner: ReturnType<typeof createECDSAMessageSigner> | null = null;
    private walletClient: any = null;
    private publicClient: ReturnType<typeof createPublicClient> | null = null;
    private authResolvers: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    private channelResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private closeChannelResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();

    constructor() {
        // Initialize immediately when the module loads
        this.initialize();
    }

    private async initialize() {
        try {
            const wallet = getWallet();

            this.walletClient = createWalletClient({
                account: wallet,
                chain: sepolia,
                transport: http(),
            });

            this.publicClient = createPublicClient({
                chain: sepolia,
                transport: http(),
            });

            this.sessionKey = generateSessionKey();
            storeSessionKey(this.sessionKey);
            this.sessionSigner = createECDSAMessageSigner(this.sessionKey.privateKey);

            console.log('🔧 WebSocket service initialized');
            console.log(`📍 Wallet address: ${wallet.address}`);
            console.log(`🔑 Session key: ${this.sessionKey.address}`);

            // Connect and authenticate
            this.connect();
        } catch (error) {
            console.error('❌ Failed to initialize WebSocket service:', error);
        }
    }

    public connect() {
        if (this.socket && this.socket.readyState < 2) return;

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

            // Send any queued messages
            this.messageQueue.forEach((msg) => this.socket?.send(msg));
            this.messageQueue = [];

            // Start authentication
            this.startAuthentication();
        };

        this.socket.onmessage = (event) => {
            try {
                console.log('📩 Raw message received:', event.data);
                // Parse the message using SDK utilities
                const data = parseAnyRPCResponse(event.data);
                const rawMessage = JSON.parse(event.data);
                const method = getMethod(rawMessage);
                console.log('📩 Parsed message method:', method);
                console.log('📩 Parsed data:', data);
                this.handleMessage(data, method);
                this.messageListeners.forEach((listener) => listener(data));
            } catch (error) {
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

    private scheduleReconnect() {
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

    private async startAuthentication() {
        if (!this.sessionKey || !this.walletClient) {
            console.error('❌ Cannot authenticate: session key or wallet not initialized');
            return;
        }

        const wallet = getWallet();
        const sessionExpireTimestamp = BigInt(Math.floor(Date.now() / 1000) + SESSION_DURATION);

        const authMessage = await createAuthRequestMessage({
            address: wallet.address,
            session_key: this.sessionKey.address,
            application: AUTH_SCOPE,
            allowances: AUTH_ALLOWANCES,
            expires_at: sessionExpireTimestamp,
            scope: 'median.app',
        });

        console.log('📤 Sending auth request...');
        this.send(authMessage);
    }

    private async handleMessage(message: RPCResponse, method?: string) {
        // Use the extracted method if available
        const messageMethod = method || message.method;
        console.log('🔄 Handling message with method:', messageMethod);

        switch (messageMethod) {
            case RPCMethod.AuthChallenge:
            case 'auth_challenge':
                await this.handleAuthChallenge(message as AuthChallengeResponse);
                break;

            case RPCMethod.AuthVerify:
            case 'auth_verify':
                this.handleAuthVerify(message);
                break;

            case RPCMethod.CreateChannel:
            case 'create_channel':
                this.handleCreateChannel(message);
                break;

            case RPCMethod.CloseChannel:
            case 'close_channel':
                this.handleCloseChannel(message);
                break;

            case RPCMethod.Error:
            case 'error':
                console.error('❌ RPC Error:', message.params);
                // Reject any pending channel resolvers
                this.channelResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.channelResolvers.clear();
                this.closeChannelResolvers.forEach(({ reject }) => reject(new Error(JSON.stringify(message.params))));
                this.closeChannelResolvers.clear();
                break;

            default:
                console.log('📩 Unhandled message method:', messageMethod);
                break;
        }
    }

    private async handleAuthChallenge(message: AuthChallengeResponse) {
        console.log('🔐 Received auth challenge');

        if (!this.sessionKey || !this.walletClient) {
            console.error('❌ Cannot handle auth challenge: missing session key or wallet');
            return;
        }

        const wallet = getWallet();
        const sessionExpireTimestamp = BigInt(Math.floor(Date.now() / 1000) + SESSION_DURATION);

        const authParams = {
            scope: 'median.app',
            application: wallet.address,
            participant: this.sessionKey.address,
            expire: sessionExpireTimestamp,
            allowances: AUTH_ALLOWANCES,
            session_key: this.sessionKey.address,
            expires_at: sessionExpireTimestamp,
        };

        const eip712Signer = createEIP712AuthMessageSigner(this.walletClient, authParams, { name: AUTH_SCOPE });
        const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, message);

        console.log('📤 Sending auth verification...');
        this.send(authVerifyMessage);
    }

    private handleAuthVerify(message: RPCResponse) {
        const params = message.params as { success?: boolean };
        if (params.success) {
            console.log('✅ Authentication successful');
            this.updateStatus('Authenticated');

            // Resolve all pending auth promises
            this.authResolvers.forEach(({ resolve }) => resolve());
            this.authResolvers = [];
        } else {
            console.error('❌ Authentication failed:', message.params);
            this.authResolvers.forEach(({ reject }) => reject(new Error('Authentication failed')));
            this.authResolvers = [];
        }
    }

    private handleCreateChannel(message: RPCResponse) {
        console.log('🧬 Channel created successfully!');
        console.log('\n📋 Channel Details:');
        console.log('Channel', message);
        const params = message.params as { channel?: { participants?: any[] } };
        console.log("Participants", params.channel?.participants);

        // Resolve all pending channel promises with the message
        this.channelResolvers.forEach(({ resolve }) => resolve(message.params));
        this.channelResolvers.clear();
    }

    private handleCloseChannel(message: RPCResponse) {
        console.log('🔒 Close channel approved by server!');
        console.log('Close channel response:', message);

        // Resolve all pending close channel promises with the message
        this.closeChannelResolvers.forEach(({ resolve }) => resolve(message.params));
        this.closeChannelResolvers.clear();
    }

    public send(payload: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(payload);
        } else {
            this.messageQueue.push(payload);
        }
    }

    private updateStatus(newStatus: WsStatus) {
        this.status = newStatus;
        this.statusListeners.forEach((listener) => listener(this.status));
    }

    public getStatus(): WsStatus {
        return this.status;
    }

    public isAuthenticated(): boolean {
        return this.status === 'Authenticated';
    }

    /**
     * Wait for authentication to complete
     * Returns immediately if already authenticated
     */
    public waitForAuth(): Promise<void> {
        if (this.status === 'Authenticated') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.authResolvers.push({ resolve, reject });
        });
    }

    /**
     * Create a channel for USDC on Sepolia
     * Waits for authentication if not already authenticated
     */
    public async createChannel(): Promise<any> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        const createChannelMessage = await createCreateChannelMessage(this.sessionSigner, {
            chain_id: CHAIN_ID,
            token: USDC_TOKEN,
        });

        console.log('📤 Creating channel for USDC on Sepolia...');

        return new Promise((resolve, reject) => {
            const id = Date.now().toString();
            this.channelResolvers.set(id, { resolve, reject });
            this.send(createChannelMessage);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.channelResolvers.has(id)) {
                    this.channelResolvers.delete(id);
                    reject(new Error('Channel creation timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Create a NitroliteClient for on-chain operations
     */
    public getNitroliteClient(): NitroliteClient | null {
        if (!this.walletClient || !this.publicClient) {
            return null;
        }

        return new NitroliteClient({
            walletClient: this.walletClient,
            publicClient: this.publicClient as any,
            stateSigner: new WalletStateSigner(this.walletClient),
            addresses: getContractAddresses() as ContractAddresses,
            chainId: CHAIN_ID,
            challengeDuration: 3600n,
        });
    }

    /**
     * Create channel and submit to chain
     */
    public async createChannelOnChain(): Promise<{ channelId: string; txHash: string }> {
        const channelData = await this.createChannel();

        const nitroliteClient = this.getNitroliteClient();
        if (!nitroliteClient) {
            throw new Error('NitroliteClient not initialized');
        }

        const { channelId, txHash } = await nitroliteClient.createChannel({
            channel: channelData.channel as unknown as Channel,
            unsignedInitialState: {
                intent: channelData.state.intent as StateIntent,
                version: BigInt(channelData.state.version),
                data: channelData.state.stateData as `0x${string}`,
                allocations: channelData.state.allocations as Allocation[],
            },
            serverSignature: channelData.serverSignature as `0x${string}`,
        });

        console.log(`🧬 Channel ${channelId} created on-chain (tx: ${txHash})`);
        return { channelId, txHash };
    }

    /**
     * Close a channel - sends close request via WebSocket and executes on-chain
     */
    public async closeChannelOnChain(channelId: string): Promise<{ txHash: string }> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        const wallet = getWallet();

        console.log(`🔒 Requesting channel close for: ${channelId}`);

        // Send close channel message via WebSocket
        const closeMessage = await createCloseChannelMessage(
            this.sessionSigner,
            channelId as `0x${string}`,
            wallet.address
        );

        // Wait for server approval
        const closeData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.closeChannelResolvers.set(id, { resolve, reject });
            this.send(closeMessage);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.closeChannelResolvers.has(id)) {
                    this.closeChannelResolvers.delete(id);
                    reject(new Error('Close channel timeout'));
                }
            }, 30000);
        });

        console.log('✅ Close approved by server, executing on-chain...');

        // Execute close on-chain
        const nitroliteClient = this.getNitroliteClient();
        if (!nitroliteClient) {
            throw new Error('NitroliteClient not initialized');
        }

        const txHash = await nitroliteClient.closeChannel({
            finalState: {
                intent: closeData.state.intent as StateIntent,
                channelId: closeData.channelId as `0x${string}`,
                data: closeData.state.stateData as `0x${string}`,
                allocations: closeData.state.allocations as Allocation[],
                version: BigInt(closeData.state.version),
                serverSignature: closeData.serverSignature as `0x${string}`,
            },
            stateData: closeData.state.stateData as `0x${string}`,
        });

        console.log(`🔒 Channel ${channelId} closed on-chain (tx: ${txHash})`);
        return { txHash };
    }

    public addStatusListener(listener: StatusListener) {
        this.statusListeners.add(listener);
        listener(this.status);
    }

    public removeStatusListener(listener: StatusListener) {
        this.statusListeners.delete(listener);
    }

    public addMessageListener(listener: MessageListener) {
        this.messageListeners.add(listener);
    }

    public removeMessageListener(listener: MessageListener) {
        this.messageListeners.delete(listener);
    }

    public getSessionKey(): SessionKey | null {
        return this.sessionKey;
    }
}

export const webSocketService = new WebSocketService();