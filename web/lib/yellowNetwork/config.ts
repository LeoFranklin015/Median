// Yellow Network multi-chain configuration

// Multi-chain configuration (same addresses on all chains via CREATE2)
export const SUPPORTED_CHAINS = {
  sepolia: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    usdcToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
    custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
    adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    usdcToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
    custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
    adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
  },
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    usdcToken: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
    custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as `0x${string}`,
    adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as `0x${string}`,
  },
  optimismSepolia: {
    id: 11155420,
    name: 'Optimism Sepolia',
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

// Default chain (Sepolia) for backwards compatibility
export const YELLOW_CONFIG = {
  ws: 'ws://localhost:8000/ws',
  faucet: 'https://clearnet-sandbox.yellow.com/faucet/requestTokens',
  custody: SUPPORTED_CHAINS.sepolia.custody,
  adjudicator: SUPPORTED_CHAINS.sepolia.adjudicator,
  testToken: SUPPORTED_CHAINS.sepolia.usdcToken,
  chainId: SUPPORTED_CHAINS.sepolia.id,
} as const;

// Authentication constants
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

// EIP-712 domain for Yellow Network authentication
export const getAuthDomain = () => ({
  name: AUTH_SCOPE,
});
