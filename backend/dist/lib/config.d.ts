export declare const CHAIN_ID: 8453;
export declare const USDC_TOKEN: `0x${string}`;
export declare const AUTH_SCOPE = "Median App";
export declare const SESSION_DURATION = 3600;
export declare const ALCHEMY_API_KEY: string;
export declare const ALCHEMY_RPC_URL: string;
export declare const SUPPORTED_CHAINS: {
    readonly base: {
        readonly id: 8453;
        readonly name: "Base";
        readonly rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${string}`;
        readonly usdcToken: `0x${string}`;
        readonly custody: `0x${string}`;
        readonly adjudicator: `0x${string}`;
    };
};
export type ChainConfig = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];
export declare function getChainById(chainId: number): ChainConfig | undefined;
export declare function getChainByName(name: keyof typeof SUPPORTED_CHAINS): ChainConfig;
export declare const AUTH_ALLOWANCES: {
    asset: string;
    amount: string;
}[];
export default function getContractAddresses(): {
    custody: string;
    adjudicator: string;
};
//# sourceMappingURL=config.d.ts.map