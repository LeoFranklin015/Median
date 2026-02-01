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
    createResizeChannelMessage,
    createAppSessionMessage,
    createSubmitAppStateMessage,
    createCloseAppSessionMessage,
    createGetAppSessionsMessageV2,
    createTransferMessage,
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
    getMethod,
    State,
    RPCAppDefinition,
    RPCAppSessionAllocation,
    RPCProtocolVersion,
    RPCAppStateIntent,
    RPCAppSession,
    RPCChannelStatus
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
    private resizeChannelResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private appSessionResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private submitAppStateResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private closeAppSessionResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private getAppSessionsResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private transferResolvers: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();

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

            case RPCMethod.ResizeChannel:
            case 'resize_channel':
                this.handleResizeChannel(message);
                break;

            case RPCMethod.CreateAppSession:
            case 'create_app_session':
                this.handleCreateAppSession(message);
                break;

            case RPCMethod.SubmitAppState:
            case 'submit_app_state':
                this.handleSubmitAppState(message);
                break;

            case RPCMethod.CloseAppSession:
            case 'close_app_session':
                this.handleCloseAppSession(message);
                break;

            case RPCMethod.GetAppSessions:
            case 'get_app_sessions':
                this.handleGetAppSessions(message);
                break;

            case RPCMethod.Transfer:
            case 'transfer':
                this.handleTransfer(message);
                break;

            case RPCMethod.Error:
            case 'error':
                console.error('❌ RPC Error:', message.params);
                // Reject any pending resolvers
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

    private handleResizeChannel(message: RPCResponse) {
        console.log('📐 Resize channel approved by server!');
        console.log('Resize channel response:', message);

        // Resolve all pending resize channel promises with the message
        this.resizeChannelResolvers.forEach(({ resolve }) => resolve(message.params));
        this.resizeChannelResolvers.clear();
    }

    private handleCreateAppSession(message: RPCResponse) {
        console.log('🎮 App session created successfully!');
        console.log('App session response:', message);

        // Resolve all pending app session promises with the message
        this.appSessionResolvers.forEach(({ resolve }) => resolve(message.params));
        this.appSessionResolvers.clear();
    }

    private handleSubmitAppState(message: RPCResponse) {
        console.log('📊 App state submitted successfully!');
        console.log('Submit app state response:', message);

        // Resolve all pending submit app state promises with the message
        this.submitAppStateResolvers.forEach(({ resolve }) => resolve(message.params));
        this.submitAppStateResolvers.clear();
    }

    private handleCloseAppSession(message: RPCResponse) {
        console.log('🏁 App session closed successfully!');
        console.log('Close app session response:', message);

        // Resolve all pending close app session promises with the message
        this.closeAppSessionResolvers.forEach(({ resolve }) => resolve(message.params));
        this.closeAppSessionResolvers.clear();
    }

    private handleGetAppSessions(message: RPCResponse) {
        console.log('📋 App sessions retrieved successfully!');
        console.log('Get app sessions response:', message);

        // Resolve all pending get app sessions promises with the message
        this.getAppSessionsResolvers.forEach(({ resolve }) => resolve(message.params));
        this.getAppSessionsResolvers.clear();
    }

    private handleTransfer(message: RPCResponse) {
        console.log('💸 Transfer completed successfully!');
        console.log('Transfer response:', message);

        // Resolve all pending transfer promises with the message
        this.transferResolvers.forEach(({ resolve }) => resolve(message.params));
        this.transferResolvers.clear();
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

    /**
     * Resize a channel - sends resize request via WebSocket and executes on-chain
     * @param channelId - The channel ID to resize
     * @param resizeAmount - Amount to add/remove from channel (positive=custody→channel, negative=channel→custody)
     * @param allocateAmount - Amount to allocate/deallocate (positive=channel→unified, negative=unified→channel)
     */
    public async resizeChannelOnChain(
        channelId: string,
        resizeAmount?: bigint,
        allocateAmount?: bigint
    ): Promise<{ txHash: string }> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        const wallet = getWallet();

        // Determine funds destination based on allocate direction
        const isAllocating = allocateAmount !== undefined && allocateAmount > 0n;
        const fundsDestination = wallet.address; // Usually wallet address for resize

        console.log(`📐 Requesting channel resize for: ${channelId}`);
        if (resizeAmount !== undefined) {
            console.log(`   Resize amount: ${resizeAmount.toString()}`);
        }
        if (allocateAmount !== undefined) {
            console.log(`   Allocate amount: ${allocateAmount.toString()}`);
        }

        // Send resize channel message via WebSocket
        const resizeMessage = await createResizeChannelMessage(this.sessionSigner, {
            channel_id: channelId as `0x${string}`,
            ...(resizeAmount !== undefined && { resize_amount: resizeAmount }),
            ...(allocateAmount !== undefined && { allocate_amount: allocateAmount }),
            funds_destination: fundsDestination,
        });

        // Wait for server approval
        const resizeData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.resizeChannelResolvers.set(id, { resolve, reject });
            this.send(resizeMessage);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.resizeChannelResolvers.has(id)) {
                    this.resizeChannelResolvers.delete(id);
                    reject(new Error('Resize channel timeout'));
                }
            }, 30000);
        });

        console.log('✅ Resize approved by server, executing on-chain...');

        // Execute resize on-chain
        const nitroliteClient = this.getNitroliteClient();
        if (!nitroliteClient) {
            throw new Error('NitroliteClient not initialized');
        }

        // Fetch previous state for proof
        const previousState = await nitroliteClient.getChannelData(channelId as `0x${string}`);
        console.log('📋 Previous state fetched for proof');

        const { txHash } = await nitroliteClient.resizeChannel({
            resizeState: {
                channelId: resizeData.channelId as `0x${string}`,
                intent: resizeData.state.intent as StateIntent,
                version: BigInt(resizeData.state.version),
                data: resizeData.state.stateData as `0x${string}`,
                allocations: resizeData.state.allocations as Allocation[],
                serverSignature: resizeData.serverSignature as `0x${string}`,
            },
            proofStates: [previousState.lastValidState as State],
        });

        console.log(`📐 Channel ${channelId} resized on-chain (tx: ${txHash})`);
        return { txHash };
    }

    /**
     * Create a multi-party app session
     * @param participants - Array of participant addresses (including self)
     * @param allocations - Initial allocations for each participant
     * @param applicationName - Name of the application
     */
    public async createAppSession(
        participants: string[],
        allocations: { participant: string; asset: string; amount: string }[],
        applicationName: string = 'Median App'
    ): Promise<{ appSessionId: string }> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        console.log(`🎮 Creating app session for: ${applicationName}`);
        console.log(`   Participants: ${participants.join(', ')}`);

        // Each participant gets equal weight, quorum set to single participant weight
        // so only one party needs to sign
        const singleWeight = Math.floor(100 / participants.length);
        const definition: RPCAppDefinition = {
            protocol: RPCProtocolVersion.NitroRPC_0_4,
            participants: participants as `0x${string}`[],
            weights: participants.map(() => singleWeight),
            quorum: singleWeight, // Only one party needs to agree
            challenge: 0,
            nonce: Date.now(),
            application: applicationName,
        };

        const rpcAllocations: RPCAppSessionAllocation[] = allocations.map(a => ({
            participant: a.participant as `0x${string}`,
            asset: a.asset,
            amount: a.amount,
        }));

        const sessionMessage = await createAppSessionMessage(this.sessionSigner, {
            definition,
            allocations: rpcAllocations,
        });

        // Wait for server response
        const sessionData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.appSessionResolvers.set(id, { resolve, reject });
            this.send(sessionMessage);

            // Timeout after 30 seconds
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

    /**
     * Submit updated state for an app session
     * @param appSessionId - The app session ID
     * @param allocations - Updated allocations
     * @param intent - The state intent (default: Operate)
     */
    public async submitAppState(
        appSessionId: string,
        allocations: { participant: string; asset: string; amount: string }[],
        intent: RPCAppStateIntent = RPCAppStateIntent.Operate
    ): Promise<{ success: boolean }> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        // Get current version from the app session
        const currentVersion = await this.getAppSessionVersion(appSessionId);
        const newVersion = currentVersion + 1;

        console.log(`📊 Submitting state update for session: ${appSessionId}`);
        console.log(`   Current version: ${currentVersion}, submitting version: ${newVersion}`);

        const rpcAllocations: RPCAppSessionAllocation[] = allocations.map(a => ({
            participant: a.participant as `0x${string}`,
            asset: a.asset,
            amount: a.amount,
        }));

        const stateMessage = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(this.sessionSigner, {
            app_session_id: appSessionId as `0x${string}`,
            intent,
            version: newVersion,
            allocations: rpcAllocations,
        });

        // Wait for server response
        const stateData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.submitAppStateResolvers.set(id, { resolve, reject });
            this.send(stateMessage);

            // Timeout after 30 seconds
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

    /**
     * Close an app session with final allocations
     * @param appSessionId - The app session ID
     * @param allocations - Final allocations
     */
    public async closeAppSession(
        appSessionId: string,
        allocations: { participant: string; asset: string; amount: string }[]
    ): Promise<{ success: boolean }> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        console.log(`🏁 Closing app session: ${appSessionId}`);

        const rpcAllocations: RPCAppSessionAllocation[] = allocations.map(a => ({
            participant: a.participant as `0x${string}`,
            asset: a.asset,
            amount: a.amount,
        }));

        const closeMessage = await createCloseAppSessionMessage(this.sessionSigner, {
            app_session_id: appSessionId as `0x${string}`,
            allocations: rpcAllocations,
        });

        // Wait for server response
        const closeData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.closeAppSessionResolvers.set(id, { resolve, reject });
            this.send(closeMessage);

            // Timeout after 30 seconds
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

    /**
     * Get app sessions for a participant
     * @param participant - The participant address (optional, defaults to wallet address)
     * @param status - Optional status filter (defaults to undefined = all statuses)
     */
    public async getAppSessions(participant?: string, status?: RPCChannelStatus): Promise<RPCAppSession[]> {
        await this.waitForAuth();

        const wallet = getWallet();
        const participantAddress = (participant || wallet.address) as `0x${string}`;

        console.log(`📋 Getting app sessions for: ${participantAddress}${status ? ` (status: ${status})` : ' (all statuses)'}`);

        const getSessionsMessage = createGetAppSessionsMessageV2(participantAddress, status);

        // Wait for server response
        const sessionsData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.getAppSessionsResolvers.set(id, { resolve, reject });
            this.send(getSessionsMessage);

            // Timeout after 30 seconds
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

    /**
     * Get the current version for an app session
     * @param appSessionId - The app session ID
     */
    public async getAppSessionVersion(appSessionId: string): Promise<number> {
        const sessions = await this.getAppSessions();
        console.log(`📋 Looking for session ${appSessionId} in ${sessions.length} sessions`);
        console.log(`📋 Available sessions:`, sessions.map((s: RPCAppSession) => ({ id: s.appSessionId, version: s.version })));

        const session = sessions.find((s: RPCAppSession) =>
            s.appSessionId.toLowerCase() === appSessionId.toLowerCase()
        );
        if (!session) {
            throw new Error(`App session not found: ${appSessionId}`);
        }
        return session.version;
    }

    /**
     * Transfer funds to another participant
     * @param destination - The destination address
     * @param allocations - Array of allocations with asset and amount
     */
    public async transfer(
        destination: string,
        allocations: { asset: string; amount: string }[]
    ): Promise<{ success: boolean }> {
        await this.waitForAuth();

        if (!this.sessionSigner) {
            throw new Error('Session signer not initialized');
        }

        console.log(`💸 Initiating transfer to: ${destination}`);
        console.log(`   Allocations:`, allocations);

        const transferMessage = await createTransferMessage(this.sessionSigner, {
            destination: destination as `0x${string}`,
            allocations: allocations.map(a => ({
                asset: a.asset,
                amount: a.amount,
            })),
        });

        // Wait for server response
        const transferData = await new Promise<any>((resolve, reject) => {
            const id = Date.now().toString();
            this.transferResolvers.set(id, { resolve, reject });
            this.send(transferMessage);

            // Timeout after 30 seconds
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