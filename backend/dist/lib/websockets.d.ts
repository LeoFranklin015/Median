import { RPCResponse, NitroliteClient, RPCAppStateIntent, RPCAppSession, RPCChannelStatus } from '@erc7824/nitrolite';
import { SessionKey } from './sessionStore';
export type WsStatus = 'Connecting' | 'Connected' | 'Authenticated' | 'Disconnected';
type StatusListener = (status: WsStatus) => void;
type MessageListener = (data: RPCResponse) => void;
declare class WebSocketService {
    private socket;
    private status;
    private statusListeners;
    private messageListeners;
    private messageQueue;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private sessionKey;
    private sessionSigner;
    private walletClient;
    private publicClient;
    private authResolvers;
    private channelResolvers;
    private closeChannelResolvers;
    private resizeChannelResolvers;
    private appSessionResolvers;
    private submitAppStateResolvers;
    private closeAppSessionResolvers;
    private getAppSessionsResolvers;
    private transferResolvers;
    private channelIdsByChain;
    constructor();
    private initialize;
    connect(): void;
    private scheduleReconnect;
    private startAuthentication;
    private handleMessage;
    private handleAuthChallenge;
    private handleAuthVerify;
    private handleCreateChannel;
    private handleCloseChannel;
    private handleResizeChannel;
    private handleCreateAppSession;
    private handleSubmitAppState;
    private handleCloseAppSession;
    private handleGetAppSessions;
    private handleAppStateUpdate;
    private fetchPrice;
    private handleOpenPerpPosition;
    private handleClosePerpPosition;
    private handleCrossChainWithdrawal;
    private updateCrossChainStatus;
    private handleTransfer;
    send(payload: string): void;
    private updateStatus;
    getStatus(): WsStatus;
    isAuthenticated(): boolean;
    waitForAuth(): Promise<void>;
    createChannel(): Promise<any>;
    getNitroliteClient(): NitroliteClient | null;
    createChannelOnChain(): Promise<{
        channelId: string;
        txHash: string;
    }>;
    getOrCreateChannelForChain(chainId: number): Promise<string>;
    closeChannelOnChain(channelId: string): Promise<{
        txHash: string;
    }>;
    resizeChannelOnChain(channelId: string, resizeAmount?: bigint, allocateAmount?: bigint, chainId?: number): Promise<{
        txHash: string;
    }>;
    createAppSession(participants: string[], allocations: {
        participant: string;
        asset: string;
        amount: string;
    }[], applicationName?: string): Promise<{
        appSessionId: string;
    }>;
    submitAppState(appSessionId: string, allocations: {
        participant: string;
        asset: string;
        amount: string;
    }[], intent?: RPCAppStateIntent, sessionData?: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    closeAppSession(appSessionId: string, allocations: {
        participant: string;
        asset: string;
        amount: string;
    }[]): Promise<{
        success: boolean;
    }>;
    getAppSessions(participant?: string, status?: RPCChannelStatus): Promise<RPCAppSession[]>;
    getAppSessionVersion(appSessionId: string): Promise<number>;
    transfer(destination: string, allocations: {
        asset: string;
        amount: string;
    }[]): Promise<{
        success: boolean;
    }>;
    addStatusListener(listener: StatusListener): void;
    removeStatusListener(listener: StatusListener): void;
    addMessageListener(listener: MessageListener): void;
    removeMessageListener(listener: MessageListener): void;
    getSessionKey(): SessionKey | null;
}
export declare const webSocketService: WebSocketService;
export {};
//# sourceMappingURL=websockets.d.ts.map