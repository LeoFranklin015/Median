export interface CloseAppSessionParams {
    appSessionId: string;
    allocations: {
        participant: string;
        asset: string;
        amount: string;
    }[];
}
export declare function closeAppSession(params: CloseAppSessionParams): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=close.d.ts.map