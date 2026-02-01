// Yellow Network Base Sepolia configuration
export const YELLOW_CONFIG = {
  ws: 'wss://yellow.philotheephilix.in/ws',
  faucet: 'https://clearnet-sandbox.yellow.com/faucet/requestTokens',
  custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const,
  adjudicator: '0x7c7ccbc98469BCC6c926307794fDfB11F2' as const,
  testToken: '0x036cbd53842c5426634e7929541ec2318f3dcf7e' as const, // USDC on Base Sepolia
  chainId: 84532, // Base Sepolia
} as const;

// Authentication constants
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

// Session key storage key
export const SESSION_KEY_STORAGE = 'median_yellow_session_key';

// EIP-712 domain for Yellow Network authentication
export const getAuthDomain = () => ({
  name: AUTH_SCOPE,
});
