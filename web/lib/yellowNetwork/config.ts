// Yellow Network Ethereum Sepolia configuration
export const YELLOW_CONFIG = {
  ws: 'ws://localhost:8000/ws',
  faucet: 'https://clearnet-sandbox.yellow.com/faucet/requestTokens',
  custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC' as const,
  adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3' as const,
  testToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const, // USDC on Sepolia
  chainId: 11155111, // Ethereum Sepolia
} as const;

// Authentication constants
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

// EIP-712 domain for Yellow Network authentication
export const getAuthDomain = () => ({
  name: AUTH_SCOPE,
});
