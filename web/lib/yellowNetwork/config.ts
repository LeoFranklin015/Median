// Yellow Network Ethereum Sepolia configuration
export const YELLOW_CONFIG = {
  ws: 'ws://localhost:8000/ws',
  faucet: 'https://clearnet-sandbox.yellow.com/faucet/requestTokens',
  custody: '0x34BaaF75820C4256D25A0bF19c8B5FAdEf9A4d4C' as const,
  adjudicator: '0x7c7ccbc98469BCC6c926307794fDfB11F2' as const,
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
