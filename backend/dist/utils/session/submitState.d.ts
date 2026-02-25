export interface SubmitAppStateParams {
    appSessionId: string;
    allocations: {
        participant: string;
        asset: string;
        amount: string;
    }[];
    sessionData?: Record<string, unknown>;
    intent?: 'operate' | 'deposit' | 'withdraw';
}
export declare function submitAppState(params: SubmitAppStateParams): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=submitState.d.ts.map