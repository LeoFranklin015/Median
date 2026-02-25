export interface TransferParams {
    destination: string;
    allocations: {
        asset: string;
        amount: string;
    }[];
}
export declare function transfer(params: TransferParams): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=transfer.d.ts.map