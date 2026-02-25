export interface CreateAppSessionParams {
    participants: string[];
    allocations: {
        participant: string;
        asset: string;
        amount: string;
    }[];
    applicationName?: string;
}
export declare function createAppSession(params: CreateAppSessionParams): Promise<{
    appSessionId: string;
}>;
//# sourceMappingURL=create.d.ts.map