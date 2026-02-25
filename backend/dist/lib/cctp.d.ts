export interface BridgeParams {
    sourceChainId: number;
    destChainId: number;
    amount: string;
    recipientAddress?: string;
}
export interface BridgeResult {
    success: boolean;
    txHash?: string;
    error?: string;
}
export declare function bridgeUSDC(params: BridgeParams): Promise<BridgeResult>;
export declare function getEstimatedBridgeTime(): number;
export declare function isBridgeSupported(sourceChainId: number, destChainId: number): boolean;
export interface CrossChainWithdrawalParams {
    sourceChainId: number;
    destChainId: number;
    amount: string;
    userWallet: string;
}
export interface CrossChainWithdrawalResult {
    success: boolean;
    txHash?: string;
    error?: string;
}
export interface CrossChainCallbacks {
    getOrCreateChannelForChain: (chainId: number) => Promise<string>;
    resizeChannelOnChain: (channelId: string, resizeAmount: bigint, allocateAmount: bigint, chainId: number) => Promise<{
        txHash: string;
    }>;
}
export declare function performCrossChainWithdrawal(params: CrossChainWithdrawalParams, callbacks: CrossChainCallbacks): Promise<CrossChainWithdrawalResult>;
//# sourceMappingURL=cctp.d.ts.map