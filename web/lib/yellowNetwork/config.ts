// Yellow Network configuration — Base Mainnet only

export const SUPPORTED_CHAINS = {
  base: {
    id: 8453,
    name: 'Base',
    usdcToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
    custody: '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6' as `0x${string}`,
    adjudicator: '0xcbbc03a873c11beeFA8D99477E830be48d8Ae6D7' as `0x${string}`,
  },
} as const;

export type ChainConfig = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
}

export function getChainByName(name: keyof typeof SUPPORTED_CHAINS): ChainConfig {
  return SUPPORTED_CHAINS[name];
}

// Default chain (Base Mainnet)
export const YELLOW_CONFIG = {
  ws: 'wss://clearnet.yellow.com/ws',
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
