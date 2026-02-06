import { sepolia } from 'viem/chains';

export const CHAIN_ID = sepolia.id;
export const USDC_TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

// Alchemy RPC configuration
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
export const ALCHEMY_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Multi-chain configuration for CCTP cross-chain transfers
export const SUPPORTED_CHAINS = {
    sepolia: {
        id: 11155111,
        name: 'Ethereum Sepolia',
        cctpName: 'Ethereum_Sepolia',
        rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        usdcToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
        custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
        adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
    },
    baseSepolia: {
        id: 84532,
        name: 'Base Sepolia',
        cctpName: 'Base_Sepolia',
        rpcUrl: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        usdcToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
        custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
        adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
    },
    arbitrumSepolia: {
        id: 421614,
        name: 'Arbitrum Sepolia',
        cctpName: 'Arbitrum_Sepolia',
        rpcUrl: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        usdcToken: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
        custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
        adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
    },
    optimismSepolia: {
        id: 11155420,
        name: 'Optimism Sepolia',
        cctpName: 'OP_Sepolia',
        rpcUrl: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        usdcToken: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as `0x${string}`,
        custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
        adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
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
    // Stock tokens
    { asset: 'AAPL', amount: '100000000000' },
    { asset: 'AMZN', amount: '100000000000' },
    { asset: 'GOOG', amount: '100000000000' },
    { asset: 'MSFT', amount: '100000000000' },
    { asset: 'TSLA', amount: '100000000000' },
    { asset: 'NVDA', amount: '100000000000' },
    { asset: 'PFE', amount: '100000000000' },
    { asset: 'INTC', amount: '100000000000' },
    { asset: 'SOFI', amount: '100000000000' },
    { asset: 'OPEN', amount: '100000000000' },
    { asset: 'ONDS', amount: '100000000000' },
    { asset: 'META', amount: '100000000000' },
    { asset: 'NFLX', amount: '100000000000' },
    { asset: 'AMD', amount: '100000000000' },
    { asset: 'JPM', amount: '100000000000' },
];

export default function getContractAddresses() {
    return {
        custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC',
        adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3',
    }
}