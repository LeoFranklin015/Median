import type { NitroliteClient } from '@erc7824/nitrolite';

// Session key type
export interface SessionKey {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

// Channel information
export interface ChannelInfo {
  channelId: string;
  balance: string;
  token: `0x${string}`;
  chainId: number;
  createdAt: number;
}

// Activity log entry
export interface ActivityLogEntry {
  time: string;
  message: string;
  data?: any;
}

// Connection states
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'switching_chain'
  | 'initializing'
  | 'authenticating'
  | 'signing'
  | 'authenticated'
  | 'error';

// Unified balance type
export interface UnifiedBalance {
  asset: string;
  amount: string;
}

// Ledger entry for transaction history
export interface LedgerEntry {
  id: number;
  accountId: string;
  accountType: number;
  asset: string;
  participant: string;
  credit: string;
  debit: string;
  createdAt: string;
}

// Yellow Network context state
export interface YellowNetworkState {
  // Connection
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionStatus: ConnectionStatus;

  // Session
  sessionKey: SessionKey | null;

  // Channel
  channel: ChannelInfo | null;

  // Balances
  unifiedBalances: UnifiedBalance[];

  // Ledger entries (transaction history)
  ledgerEntries: LedgerEntry[];

  // Activity
  activityLog: ActivityLogEntry[];
}

// Yellow Network context actions
export interface YellowNetworkActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  resetSession: () => void;
  createChannel: () => Promise<void>;
  fundChannel: (amount: string) => Promise<void>;
  closeChannel: (channelId?: string) => Promise<{ txHash: string }>;
  requestFaucet: () => Promise<void>;
  clearActivityLog: () => void;
  depositToCustody: (amount: string) => Promise<{ txHash: string }>;
  withdrawFromCustody: (amount: string) => Promise<{ txHash: string }>;
  addToTradingBalance: (amount: string) => Promise<void>;
  withdrawFromTradingBalance: (amount: string) => Promise<void>;
  refreshLedgerEntries: () => Promise<void>;
  createAppSession: (participants: string[], allocations: { participant: string; asset: string; amount: string }[], applicationName?: string) => Promise<{ appSessionId: string }>;
  submitAppState: (appSessionId: string, allocations: { participant: string; asset: string; amount: string }[], intent?: 'operate' | 'deposit' | 'withdraw', sessionData?: Record<string, unknown>) => Promise<{ success: boolean }>;
  transfer: (destination: string, allocations: { asset: string; amount: string }[]) => Promise<{ success: boolean }>;
}

// Combined context value
export interface YellowNetworkContextValue extends YellowNetworkState, YellowNetworkActions {
  // Expose refs for advanced usage
  nitroliteClient: NitroliteClient | null;
}

// Close channel resolver type
export interface CloseChannelResolver {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}
