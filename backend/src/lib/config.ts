import { base } from 'viem/chains';

export const CHAIN_ID = base.id;
export const USDC_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

// Alchemy RPC configuration
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
export const ALCHEMY_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Base mainnet configuration
export const SUPPORTED_CHAINS = {
    base: {
        id: 8453,
        name: 'Base',
        rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        usdcToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
        custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as `0x${string}`,
        adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as `0x${string}`,
    },
} as const;

export type ChainConfig = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

export function getChainById(chainId: number): ChainConfig | undefined {
    return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
}

export function getChainByName(name: keyof typeof SUPPORTED_CHAINS): ChainConfig {
    return SUPPORTED_CHAINS[name];
}

export const AUTH_ALLOWANCES = [
    { asset: 'usdc', amount: '100000000000' },
];

export default function getContractAddresses() {
    return {
        custody: '0x019B65A265EB3363822f2752141b3dF16131b262',
        adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
    }
}