// Yellow Network Base mainnet configuration

// Base mainnet configuration
export const SUPPORTED_CHAINS = {
  base: {
    id: 8453,
    name: 'Base',
    usdcToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
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

// Default chain (Base mainnet)
export const YELLOW_CONFIG = {
  ws: 'wss://yellow.philotheephilix.in/ws',
  faucet: 'https://clearnet-sandbox.yellow.com/faucet/requestTokens',
  custody: SUPPORTED_CHAINS.base.custody,
  adjudicator: SUPPORTED_CHAINS.base.adjudicator,
  testToken: SUPPORTED_CHAINS.base.usdcToken,
  chainId: SUPPORTED_CHAINS.base.id,
} as const;

// Authentication constants
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

// EIP-712 domain for Yellow Network authentication
export const getAuthDomain = () => ({
  name: AUTH_SCOPE,
});
