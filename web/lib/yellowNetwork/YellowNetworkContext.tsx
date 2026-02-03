'use client';

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { toast } from 'sonner';
import {
  NitroliteClient,
  WalletStateSigner,
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createECDSAMessageSigner,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createCloseChannelMessage,
  parseAnyRPCResponse,
  RPCMethod,
  type AuthChallengeResponse,
  type AuthRequestParams,
  type Allocation,
  type RPCLedgerEntry,
  StateIntent,
} from '@erc7824/nitrolite';

import type {
  YellowNetworkContextValue,
  SessionKey,
  ChannelInfo,
  ActivityLogEntry,
  ConnectionStatus,
  CloseChannelResolver,
  UnifiedBalance,
  LedgerEntry,
} from './types';
import { YELLOW_CONFIG, AUTH_SCOPE, SESSION_DURATION, getAuthDomain } from './config';
import { getOrCreateSessionKey, clearSessionKey, generateSessionKey, storeSessionKey } from './sessionKey';

// Create context with undefined default
const YellowNetworkContext = createContext<YellowNetworkContextValue | undefined>(undefined);

// Max activity log entries
const MAX_LOG_ENTRIES = 50;

interface YellowNetworkProviderProps {
  children: React.ReactNode;
}

export function YellowNetworkProvider({ children }: YellowNetworkProviderProps) {
  // Wagmi hooks
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();

  // Refs for WebSocket and clients (persist across renders)
  const wsRef = useRef<WebSocket | null>(null);
  const nitroliteClientRef = useRef<NitroliteClient | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const sessionExpireTimestampRef = useRef<string>('');
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Refs for latest values (needed in WebSocket callbacks)
  const walletClientRef = useRef<typeof walletClient>(null);
  const addressRef = useRef<`0x${string}` | undefined>(undefined);
  const sessionKeyRef = useRef<SessionKey | null>(null);

  // Resolvers for async operations
  const closeChannelResolversRef = useRef<Map<string, CloseChannelResolver>>(new Map());
  const createChannelResolverRef = useRef<{
    resolve: (data: { channelInfo: ChannelInfo; fullResponse: any }) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const fundChannelResolverRef = useRef<{
    resolve: (data: any) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [unifiedBalances, setUnifiedBalances] = useState<UnifiedBalance[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  // Keep refs updated
  useEffect(() => {
    walletClientRef.current = walletClient;
    addressRef.current = address;
  }, [walletClient, address]);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
  }, [sessionKey]);

  // Initialize session key on mount
  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    console.log('Session key initialized:', key.address);
  }, []);

  // Channel ID localStorage helpers
  const CHANNEL_ID_KEY = 'yellow_channel_id';

  const getStoredChannelId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CHANNEL_ID_KEY);
  }, []);

  const storeChannelId = useCallback((channelId: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CHANNEL_ID_KEY, channelId);
    console.log('Channel ID stored:', channelId);
  }, []);

  // Load stored channel ID on mount
  useEffect(() => {
    const storedChannelId = getStoredChannelId();
    if (storedChannelId) {
      console.log('Restored channel ID from storage:', storedChannelId);
      setChannel({
        channelId: storedChannelId,
        balance: '0',
        token: YELLOW_CONFIG.testToken,
        chainId: YELLOW_CONFIG.chainId,
        createdAt: Date.now(),
      });
    }
  }, [getStoredChannelId]);

  // Helper to add log entries
  const addLog = useCallback((message: string, data?: any) => {
    const entry: ActivityLogEntry = {
      time: new Date().toLocaleTimeString(),
      message,
      data,
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
  }, []);

  // Clear activity log
  const clearActivityLog = useCallback(() => {
    setActivityLog([]);
  }, []);

  // Send message via WebSocket
  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
      return true;
    }
    return false;
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      console.log('📨 Raw message:', event.data);

      try {
        const response = parseAnyRPCResponse(event.data);
        console.log('Parsed response:', response);
        console.log('Response method:', response.method, 'Expected:', RPCMethod.GetLedgerEntries);
        addLog(`Received: ${response.method}`, response);

        const currentWalletClient = walletClientRef.current;
        const currentAddress = addressRef.current;
        const currentSessionKey = sessionKeyRef.current;

        // Handle auth challenge
        if (response.method === RPCMethod.AuthChallenge) {
          console.log('Received auth challenge');

          if (!currentWalletClient || !currentAddress || !currentSessionKey) {
            console.error('Wallet or session key not available for auth challenge');
            addLog('Auth challenge failed - wallet not available');
            toast.error('Wallet not available');
            return;
          }

          setConnectionStatus('signing');
          addLog('Signing auth challenge');

          try {
            const challengeResponse = response as AuthChallengeResponse;
            const allowances = [{ asset: 'usdc', amount: '1' }];
            const authParams = {
              scope: 'median.app',
              application: currentAddress as `0x${string}`,
              participant: currentSessionKey.address,
              expire: sessionExpireTimestampRef.current,
              allowances,
              session_key: currentSessionKey.address,
              expires_at: BigInt(sessionExpireTimestampRef.current),
            };

            const eip712Signer = createEIP712AuthMessageSigner(
              currentWalletClient,
              authParams,
              getAuthDomain()
            );

            const authVerifyPayload = await createAuthVerifyMessage(
              eip712Signer,
              challengeResponse
            );

            if (sendMessage(authVerifyPayload)) {
              addLog('Auth verification sent');
            } else {
              throw new Error('WebSocket closed during authentication');
            }
          } catch (error) {
            console.error('Auth challenge handling error:', error);
            addLog('Auth challenge failed', { error: String(error) });
            toast.error('Signature rejected or authentication failed');
            setConnectionStatus('error');
          }
        }
        // Handle auth success
        else if (response.method === RPCMethod.AuthVerify) {
          console.log('✅ Authentication successful!');
          setIsAuthenticated(true);
          setConnectionStatus('authenticated');
          reconnectAttemptRef.current = 0;
          addLog('Authentication successful! ✅');
          toast.success('Authenticated with Yellow Network!');

          // Fetch ledger entries after authentication to calculate balance
          if (currentAddress && currentSessionKey) {
            try {
              // Manually construct the request with wallet parameter (like CLI does)
              const requestId = Date.now();
              const timestamp = Math.floor(Date.now() / 1000);
              // CLI uses: wallet, account_id, asset
              const params = {
                wallet: currentAddress,
                account_id: currentAddress,
                asset: 'usdc',
              };

              // Create and sign the message
              const sessionSigner = createECDSAMessageSigner(currentSessionKey.privateKey);
              const payload = [requestId, 'get_ledger_entries', params, timestamp] as const;
              const signature = await sessionSigner(payload as any);

              const entriesMsg = JSON.stringify({
                req: payload,
                sig: [signature],
              });

              console.log('📤 Sending ledger entries request:', entriesMsg);
              sendMessage(entriesMsg);
              addLog('Requested ledger entries', { wallet: currentAddress, accountId: currentAddress, asset_symbol: 'usdc' });
            } catch (error) {
              console.error('Failed to request ledger entries:', error);
            }
          }
        }
        // Handle channel creation response
        else if (response.method === 'create_channel') {
          const { channelId: newChannelId } = response.params;
          console.log('Channel created:', newChannelId);

          const channelInfo: ChannelInfo = {
            channelId: newChannelId,
            balance: '0',
            token: YELLOW_CONFIG.testToken,
            chainId: YELLOW_CONFIG.chainId,
            createdAt: Date.now(),
          };

          setChannel(channelInfo);

          // Store channel ID in localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('yellow_channel_id', newChannelId);
            console.log('Channel ID stored in localStorage:', newChannelId);
          }

          // Note: On-chain channel creation is now handled in createChannelAndWait
          addLog('Channel created successfully (off-chain)', { channelId: newChannelId });
          toast.success('Channel created!');

          // Resolve promise if waiting - pass full response for on-chain creation
          if (createChannelResolverRef.current) {
            createChannelResolverRef.current.resolve({
              channelInfo,
              fullResponse: response.params,
            });
            createChannelResolverRef.current = null;
          }
        }
        // Handle resize response
        else if (response.method === 'resize_channel') {
          console.log('Channel resize approved:', response.params);
          addLog('Channel resize approved by server', response.params);

          const totalBalance = response.params.state.allocations.reduce(
            (sum: bigint, alloc: any) => sum + BigInt(alloc.amount),
            BigInt(0)
          );

          const newBalance = totalBalance.toString();
          setChannel((prev) => (prev ? { ...prev, balance: newBalance } : null));

          // Resolve promise with full response data for on-chain execution
          if (fundChannelResolverRef.current) {
            fundChannelResolverRef.current.resolve(response.params);
            fundChannelResolverRef.current = null;
          }
        }
        // Handle close channel response
        else if (response.method === 'close_channel') {
          console.log('Close channel approved:', response.params);
          addLog('Close channel approved by server', response.params);

          // Resolve the first pending close request
          const resolvers = closeChannelResolversRef.current;
          const firstKey = resolvers.keys().next().value;
          if (firstKey) {
            const resolver = resolvers.get(firstKey);
            if (resolver) {
              resolver.resolve(response.params);
              resolvers.delete(firstKey);
            }
          }
        }
        // Handle ledger entries response - calculate balance from credit/debit
        else if (response.method === RPCMethod.GetLedgerEntries) {
          console.log('📊 Raw ledger entries response:', JSON.stringify(response.params));
          // Try both camelCase and snake_case field names
          const params = response.params as { ledgerEntries?: RPCLedgerEntry[]; ledger_entries?: RPCLedgerEntry[] };
          const entries: RPCLedgerEntry[] = params?.ledgerEntries || params?.ledger_entries || [];
          console.log('📊 Ledger entries parsed:', entries);

          // Store ledger entries for transaction history
          const formattedEntries: LedgerEntry[] = entries.map((entry) => ({
            id: entry.id,
            accountId: entry.accountId as string,
            accountType: entry.accountType,
            asset: entry.asset,
            participant: entry.participant as string,
            credit: entry.credit,
            debit: entry.debit,
            createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
          }));
          setLedgerEntries(formattedEntries);

          // Calculate balance: sum of credits - sum of debits
          const totalCredit = entries.reduce((sum, entry) => sum + parseFloat(entry.credit || '0'), 0);
          const totalDebit = entries.reduce((sum, entry) => sum + parseFloat(entry.debit || '0'), 0);
          const balance = (totalCredit - totalDebit).toString();

          // Get asset from first entry or default to 'usdc'
          const asset = entries.length > 0 ? entries[0].asset : 'usdc';

          console.log('📊 Calculated balance:', { totalCredit, totalDebit, balance, asset });
          setUnifiedBalances([{ asset, amount: balance }]);
          addLog('Ledger entries processed', { entries: entries.length, balance, totalCredit, totalDebit });
        }
        // Handle errors
        else if (response.method === RPCMethod.Error) {
          const error = response.params?.error || 'Unknown error';
          console.error('❌ Error from server:', error);
          addLog('Error received', { error, requestId: response.requestId });

          // Check for expired session key error
          if (typeof error === 'string' && error.includes('expired')) {
            toast.error('Session expired. Please reset your session and reconnect.', {
              duration: 5000,
            });
            // Close the connection
            if (wsRef.current) {
              intentionalDisconnectRef.current = true;
              wsRef.current.close();
            }
            setConnectionStatus('error');
          } else {
            toast.error(`Server error: ${error}`);
          }

          // Reject any pending promises
          if (createChannelResolverRef.current) {
            createChannelResolverRef.current.reject(new Error(error));
            createChannelResolverRef.current = null;
          }
          if (fundChannelResolverRef.current) {
            fundChannelResolverRef.current.reject(new Error(error));
            fundChannelResolverRef.current = null;
          }
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
        addLog('Parse error', { raw: event.data, error: String(error) });
      }
    },
    [addLog, sendMessage]
  );

  // Connect to Yellow Network
  const connect = useCallback(async () => {
    if (!walletClient || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!sessionKey) {
      toast.error('Session key not initialized');
      return;
    }

    // Already connected
    if (isConnected && isAuthenticated) {
      addLog('Already connected and authenticated');
      return;
    }

    try {
      setConnectionStatus('connecting');
      addLog('Starting connection...');

      // Switch to Base Sepolia if needed
      if (chain?.id !== sepolia.id) {
        setConnectionStatus('switching_chain');
        addLog('Switching to Base Sepolia...');
        try {
          await switchChain({ chainId: sepolia.id });
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          toast.error('Please switch to Base Sepolia network');
          setConnectionStatus('error');
          return;
        }
      }

      // Initialize Nitrolite client
      setConnectionStatus('initializing');
      try {
        const client = new NitroliteClient({
          publicClient: publicClient as any,
          walletClient: walletClient as any,
          stateSigner: new WalletStateSigner(walletClient as any),
          addresses: {
            custody: YELLOW_CONFIG.custody,
            adjudicator: YELLOW_CONFIG.adjudicator,
          },
          chainId: YELLOW_CONFIG.chainId,
          challengeDuration: BigInt(3600),
        });
        nitroliteClientRef.current = client;
        addLog('Nitrolite client initialized');
      } catch (error) {
        console.warn('Nitrolite client initialization failed (non-critical):', error);
        addLog('Nitrolite client init failed (non-critical)', { error: String(error) });
      }

      // Generate expire timestamp
      const expireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);
      sessionExpireTimestampRef.current = expireTimestamp;

      // Connect WebSocket
      intentionalDisconnectRef.current = false;
      console.log('Creating WebSocket connection to:', YELLOW_CONFIG.ws);
      const ws = new WebSocket(YELLOW_CONFIG.ws);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('🟢 WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('authenticating');
        addLog('WebSocket connected');

        try {
          const currentAddress = addressRef.current;
          const currentSessionKey = sessionKeyRef.current;

          if (!currentAddress || !currentSessionKey) {
            throw new Error('Wallet or session key not available');
          }

          const allowances = [{ asset: 'usdc', amount: '1' }];
          const authParams: AuthRequestParams = {
            address: currentAddress,
            session_key: currentSessionKey.address,
            expires_at: BigInt(sessionExpireTimestampRef.current),
            scope: 'median.app',
            application: AUTH_SCOPE,
            allowances,
          };

          const authRequestMsg = await createAuthRequestMessage(authParams);
          ws.send(authRequestMsg);
          addLog('Auth request sent', { address: currentAddress });
        } catch (error) {
          console.error('Auth request error:', error);
          addLog('Auth request failed', { error: String(error) });
          toast.error('Authentication failed');
          setConnectionStatus('error');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        addLog('WebSocket error', { error: String(error) });
        toast.error('Connection failed');
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        const wasIntentional = intentionalDisconnectRef.current;
        console.log('🔴 Disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          intentional: wasIntentional,
        });

        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionStatus('disconnected');

        if (!wasIntentional) {
          addLog('Unexpected disconnect', {
            code: event.code,
            reason: event.reason || 'No reason provided',
          });

          // Auto-reconnect logic
          if (reconnectAttemptRef.current < maxReconnectAttempts) {
            reconnectAttemptRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
            addLog(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttemptRef.current})`);
            setTimeout(() => {
              if (!intentionalDisconnectRef.current) {
                connect();
              }
            }, delay);
          } else {
            toast.error('Connection lost. Please reconnect manually.');
          }
        } else {
          addLog('Disconnected from Yellow Network');
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect');
      setConnectionStatus('error');
      addLog('Connection failed', { error: String(error) });
    }
  }, [
    walletClient,
    address,
    sessionKey,
    chain,
    isConnected,
    isAuthenticated,
    publicClient,
    switchChain,
    handleMessage,
    addLog,
  ]);

  // Auto-connect when wallet is connected
  useEffect(() => {
    // Only auto-connect if:
    // - Wallet is connected (address exists)
    // - Wallet client is available
    // - Session key is initialized
    // - Not already connected or in process of connecting
    if (
      address &&
      walletClient &&
      sessionKey &&
      !isConnected &&
      !isAuthenticated &&
      connectionStatus === 'disconnected'
    ) {
      console.log('🔄 Auto-connecting to Yellow Network...');
      connect();
    }
  }, [address, walletClient, sessionKey, isConnected, isAuthenticated, connectionStatus, connect]);

  // Disconnect from Yellow Network
  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    reconnectAttemptRef.current = 0;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsAuthenticated(false);
    setConnectionStatus('disconnected');
    setChannel(null);
    nitroliteClientRef.current = null;

    addLog('Disconnected');
    toast.info('Disconnected from Yellow Network');
  }, [addLog]);

  // Reset session key (for expired sessions)
  const resetSession = useCallback(() => {
    // Disconnect first if connected
    if (wsRef.current) {
      intentionalDisconnectRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear old session key
    clearSessionKey();

    // Generate new session key
    const newKey = generateSessionKey();
    storeSessionKey(newKey);
    setSessionKey(newKey);
    sessionKeyRef.current = newKey;

    // Reset state
    setIsConnected(false);
    setIsAuthenticated(false);
    setConnectionStatus('disconnected');
    setChannel(null);
    nitroliteClientRef.current = null;

    addLog('Session reset - new session key generated', { address: newKey.address });
    toast.success('Session reset! You can now reconnect.');
  }, [addLog]);

  // Create a payment channel
  const createChannel = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !sessionKey) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      createChannelResolverRef.current = {
        resolve: () => resolve(),
        reject,
      };

      const doCreate = async () => {
        try {
          addLog('Creating channel...');
          const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);
          const createChannelMsg = await createCreateChannelMessage(sessionSigner, {
            chain_id: YELLOW_CONFIG.chainId,
            token: YELLOW_CONFIG.testToken,
          });

          if (!sendMessage(createChannelMsg)) {
            throw new Error('Failed to send create channel message');
          }
          addLog('Channel creation request sent');
        } catch (error) {
          console.error('Create channel error:', error);
          addLog('Channel creation failed', { error: String(error) });
          reject(error);
          createChannelResolverRef.current = null;
        }
      };

      doCreate();

      // Timeout after 30 seconds
      setTimeout(() => {
        if (createChannelResolverRef.current) {
          createChannelResolverRef.current.reject(new Error('Channel creation timeout'));
          createChannelResolverRef.current = null;
        }
      }, 30000);
    });
  }, [isAuthenticated, sessionKey, sendMessage, addLog]);

  // Fund the channel
  const fundChannel = useCallback(
    async (amount: string): Promise<void> => {
      if (!channel || !sessionKey || !address) {
        throw new Error('Channel not ready');
      }

      return new Promise((resolve, reject) => {
        fundChannelResolverRef.current = {
          resolve: () => resolve(),
          reject,
        };

        const doFund = async () => {
          try {
            addLog(`Funding channel with ${amount}...`);
            const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);
            const resizeMsg = await createResizeChannelMessage(sessionSigner, {
              channel_id: channel.channelId as `0x${string}`,
              allocate_amount: BigInt(amount),
              funds_destination: address,
            });

            if (!sendMessage(resizeMsg)) {
              throw new Error('Failed to send fund channel message');
            }
            addLog('Fund request sent', { amount });
          } catch (error) {
            console.error('Fund error:', error);
            addLog('Funding failed', { error: String(error) });
            reject(error);
            fundChannelResolverRef.current = null;
          }
        };

        doFund();

        // Timeout after 30 seconds
        setTimeout(() => {
          if (fundChannelResolverRef.current) {
            fundChannelResolverRef.current.reject(new Error('Fund channel timeout'));
            fundChannelResolverRef.current = null;
          }
        }, 30000);
      });
    },
    [channel, sessionKey, address, sendMessage, addLog]
  );

  // Close the channel (on-chain)
  const closeChannel = useCallback(async (channelIdOverride?: string): Promise<{ txHash: string }> => {
    if (!sessionKey || !address) {
      throw new Error('Session not ready');
    }

    // Use provided channel ID or fall back to current channel
    const channelId = channelIdOverride || channel?.channelId;
    if (!channelId) {
      throw new Error('No channel ID provided');
    }

    if (!nitroliteClientRef.current) {
      throw new Error('Nitrolite client not initialized');
    }

    addLog(`🔒 Requesting channel close for: ${channelId}`);

    // Create session signer
    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

    // Send close channel message via WebSocket
    const closeMessage = await createCloseChannelMessage(
      sessionSigner,
      channelId as `0x${string}`,
      address
    );

    // Wait for server approval
    const closeData = await new Promise<any>((resolve, reject) => {
      const id = Date.now().toString();
      closeChannelResolversRef.current.set(id, { resolve, reject });

      if (!sendMessage(closeMessage)) {
        closeChannelResolversRef.current.delete(id);
        reject(new Error('Failed to send close channel message'));
        return;
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (closeChannelResolversRef.current.has(id)) {
          closeChannelResolversRef.current.delete(id);
          reject(new Error('Close channel timeout'));
        }
      }, 30000);
    });

    addLog('✅ Close approved by server, executing on-chain...');

    // Execute close on-chain
    const txHash = await nitroliteClientRef.current.closeChannel({
      finalState: {
        intent: closeData.state.intent as StateIntent,
        channelId: closeData.channelId as `0x${string}`,
        data: closeData.state.stateData as `0x${string}`,
        allocations: closeData.state.allocations as Allocation[],
        version: BigInt(closeData.state.version),
        serverSignature: closeData.serverSignature as `0x${string}`,
      },
      stateData: closeData.state.stateData as `0x${string}`,
    });

    addLog(`🔒 Channel ${channelId} closed on-chain (tx: ${txHash})`);
    toast.success('Channel closed successfully!');

    // Clear channel state
    setChannel(null);

    return { txHash };
  }, [channel, sessionKey, address, sendMessage, addLog]);

  // Request faucet tokens
  const requestFaucet = useCallback(async (): Promise<void> => {
    if (!address) {
      throw new Error('No wallet address');
    }

    addLog('Requesting faucet tokens...');
    toast.info('Requesting test tokens...');

    const response = await fetch(YELLOW_CONFIG.faucet, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (response.ok) {
      addLog('Faucet tokens requested successfully');
      toast.success('Test tokens requested! Check your Unified Balance.');
    } else {
      const error = await response.text();
      addLog('Faucet request failed', { error });
      throw new Error('Faucet request failed');
    }
  }, [address, addLog]);

  // Refresh ledger entries (refetch balance)
  const refreshLedgerEntries = useCallback(async (): Promise<void> => {
    const currentAddress = addressRef.current;
    const currentSessionKey = sessionKeyRef.current;

    if (!currentAddress || !currentSessionKey || !isAuthenticated) {
      return;
    }

    try {
      const requestId = Date.now();
      const timestamp = Math.floor(Date.now() / 1000);
      const params = {
        wallet: currentAddress,
        account_id: currentAddress,
        asset: 'usdc',
      };

      const sessionSigner = createECDSAMessageSigner(currentSessionKey.privateKey);
      const payload = [requestId, 'get_ledger_entries', params, timestamp] as const;
      const signature = await sessionSigner(payload as any);

      const entriesMsg = JSON.stringify({
        req: payload,
        sig: [signature],
      });

      sendMessage(entriesMsg);
      addLog('Refreshing ledger entries...');
    } catch (error) {
      console.error('Failed to refresh ledger entries:', error);
    }
  }, [isAuthenticated, sendMessage, addLog]);

  // Deposit USDC to custody contract (on-chain) using NitroliteClient
  const depositToCustody = useCallback(async (amount: string): Promise<{ txHash: string }> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!nitroliteClientRef.current) {
      throw new Error('Nitrolite client not initialized. Please reconnect.');
    }

    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDC has 6 decimals
    addLog(`Depositing ${amount} USDC to custody...`);
    toast.info(`Depositing ${amount} USDC to custody...`);

    try {
      const client = nitroliteClientRef.current;

      // Step 1: Check current allowance
      const currentAllowance = await client.getTokenAllowance(YELLOW_CONFIG.testToken);
      addLog('Current allowance', { allowance: currentAllowance.toString() });

      // Step 2: Approve if needed
      if (currentAllowance < amountInUnits) {
        addLog('Approving USDC spend...');
        const approveHash = await client.approveTokens(YELLOW_CONFIG.testToken, amountInUnits);
        addLog('USDC approved', { txHash: approveHash });
      } else {
        addLog('Sufficient allowance already exists');
      }

      // Step 3: Deposit to custody using NitroliteClient
      addLog('Depositing to custody contract...');
      const depositHash = await client.deposit(YELLOW_CONFIG.testToken, amountInUnits);
      addLog('Deposit successful!', { txHash: depositHash });
      toast.success(`Deposited ${amount} USDC to custody!`);

      return { txHash: depositHash };
    } catch (error) {
      console.error('Deposit failed:', error);
      addLog('Deposit failed', { error: String(error) });
      toast.error('Deposit failed');
      throw error;
    }
  }, [address, walletClient, publicClient, addLog]);

  // Add funds to trading balance (resize channel flow)
  // Creates channel if needed, resizes with +amount for resize and -amount for allocate, then closes
  const addToTradingBalance = useCallback(async (amount: string): Promise<void> => {
    if (!isAuthenticated || !sessionKey || !address) {
      throw new Error('Not authenticated');
    }

    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDC has 6 decimals
    addLog(`Adding ${amount} USDC to trading balance...`);
    toast.info(`Adding ${amount} USDC to trading balance...`);

    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);
    let currentChannelId = channel?.channelId;
    let createdNewChannel = false;

    // Helper to create channel and wait for response
    // Returns channel ID after creating both off-chain (WebSocket) and on-chain
    const createChannelAndWait = async (): Promise<string> => {
      // Step 1: Create channel via WebSocket
      const { channelInfo, fullResponse } = await new Promise<{ channelInfo: ChannelInfo; fullResponse: any }>((resolve, reject) => {
        createChannelResolverRef.current = {
          resolve,
          reject: (error: Error) => {
            // Check if error contains existing channel ID
            const errorMsg = error.message || '';
            const existingChannelMatch = errorMsg.match(/already exists: (0x[a-fA-F0-9]+)/);
            if (existingChannelMatch) {
              const existingChannelId = existingChannelMatch[1];
              addLog('Found existing channel, using it instead', { channelId: existingChannelId });

              // Store in localStorage for future use
              if (typeof window !== 'undefined') {
                localStorage.setItem('yellow_channel_id', existingChannelId);
              }
              const existingChannelInfo: ChannelInfo = {
                channelId: existingChannelId,
                balance: '0',
                token: YELLOW_CONFIG.testToken,
                chainId: YELLOW_CONFIG.chainId,
                createdAt: Date.now(),
              };
              setChannel(existingChannelInfo);

              // For existing channels, we don't have the full response, but channel should already be on-chain
              resolve({ channelInfo: existingChannelInfo, fullResponse: null });
            } else {
              reject(error);
            }
          },
        };

        const doCreate = async () => {
          try {
            addLog('Creating channel for transfer...');
            const createChannelMsg = await createCreateChannelMessage(sessionSigner, {
              chain_id: YELLOW_CONFIG.chainId,
              token: YELLOW_CONFIG.testToken,
            });

            if (!sendMessage(createChannelMsg)) {
              throw new Error('Failed to send create channel message');
            }
          } catch (error) {
            reject(error as Error);
            createChannelResolverRef.current = null;
          }
        };

        doCreate();

        setTimeout(() => {
          if (createChannelResolverRef.current) {
            createChannelResolverRef.current.reject(new Error('Channel creation timeout'));
            createChannelResolverRef.current = null;
          }
        }, 30000);
      });

      // Step 2: Create channel on-chain if we have the full response
      if (fullResponse && nitroliteClientRef.current) {
        const { channel: channelData, state, serverSignature } = fullResponse;

        addLog('Creating channel on-chain...');

        const unsignedInitialState = {
          intent: state.intent,
          version: BigInt(state.version),
          data: state.stateData,
          allocations: state.allocations.map((a: any) => ({
            destination: a.destination as `0x${string}`,
            token: a.token as `0x${string}`,
            amount: BigInt(a.amount),
          })),
        };

        const { txHash } = await nitroliteClientRef.current.createChannel({
          channel: {
            ...channelData,
            challenge: BigInt(channelData.challenge),
            nonce: BigInt(channelData.nonce),
          },
          unsignedInitialState,
          serverSignature,
        });

        addLog(`Channel created on-chain (tx: ${txHash})`);

        // Wait 10 seconds for channel to be indexed
        addLog('Waiting for channel to be indexed (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      return channelInfo.channelId;
    };

    // Helper to resize channel with allocation (custody → unified balance)
    // Step 1: Off-chain resize via WebSocket
    // Step 2: On-chain resize via NitroliteClient
    const resizeChannel = async (channelId: string): Promise<void> => {
      // Step 1: Send WebSocket message and wait for server approval
      const resizeData = await new Promise<any>((resolve, reject) => {
        fundChannelResolverRef.current = {
          resolve,
          reject,
        };

        const doResize = async () => {
          try {
            // resize_amount: +X (deposit from custody to channel)
            // allocate_amount: +X (allocate from channel to unified balance)
            addLog(`Resizing channel: resize_amount=${amountInUnits.toString()}, allocate_amount=${amountInUnits.toString()} (custody → unified)`);
            const resizeMsg = await createResizeChannelMessage(sessionSigner, {
              channel_id: channelId as `0x${string}`,
              resize_amount: amountInUnits,
              allocate_amount: -amountInUnits,
              funds_destination: address,
            });
            console.log('Resize message:', resizeMsg);

            if (!sendMessage(resizeMsg)) {
              throw new Error('Failed to send resize message');
            }
          } catch (error) {
            reject(error);
            fundChannelResolverRef.current = null;
          }
        };

        doResize();

        setTimeout(() => {
          if (fundChannelResolverRef.current) {
            fundChannelResolverRef.current.reject(new Error('Resize timeout'));
            fundChannelResolverRef.current = null;
          }
        }, 30000);
      });

      addLog('Resize approved by server, executing on-chain...');

      // Step 2: Execute resize on-chain
      if (!nitroliteClientRef.current) {
        throw new Error('NitroliteClient not initialized');
      }

      // Fetch previous state for proof
      const previousState = await nitroliteClientRef.current.getChannelData(channelId as `0x${string}`);
      addLog('Previous state fetched for proof');

      const { txHash } = await nitroliteClientRef.current.resizeChannel({
        resizeState: {
          channelId: resizeData.channelId as `0x${string}`,
          intent: resizeData.state.intent as StateIntent,
          version: BigInt(resizeData.state.version),
          data: resizeData.state.stateData as `0x${string}`,
          allocations: resizeData.state.allocations.map((a: any) => ({
            destination: a.destination as `0x${string}`,
            token: a.token as `0x${string}`,
            amount: BigInt(a.amount),
          })),
          serverSignature: resizeData.serverSignature as `0x${string}`,
        },
        proofStates: [previousState.lastValidState],
      });

      addLog(`Channel resized on-chain (tx: ${txHash})`);
    };

    try {
      // Step 0: Check custody balance before proceeding
      if (nitroliteClientRef.current) {
        const custodyBalance = await nitroliteClientRef.current.getAccountBalance(YELLOW_CONFIG.testToken);
        addLog('Current custody balance', { balance: custodyBalance.toString(), required: amountInUnits.toString() });

        if (custodyBalance < amountInUnits) {
          throw new Error(`Insufficient custody balance. Have: ${custodyBalance.toString()}, Need: ${amountInUnits.toString()}. Please deposit first.`);
        }
      }

      // Step 1: Try to resize existing channel or create new one
      if (!currentChannelId) {
        currentChannelId = await createChannelAndWait();
        createdNewChannel = true;
        addLog('Channel ready for resize', { channelId: currentChannelId });
        // Note: createChannelAndWait already waits 10 seconds after on-chain creation
      }

      // Step 2: Resize channel (custody → unified balance in one step)
      try {
        await resizeChannel(currentChannelId);
        addLog('Resize complete: Funds moved to unified balance');
      } catch (error: any) {
        const errorMsg = error.message || '';

        // Handle "resize already ongoing" error - close channel and create new one
        if (errorMsg.includes('resize already ongoing') || errorMsg.includes('resize ongoing')) {
          addLog('Resize already ongoing on channel, closing and creating new one...');
          toast.info('Channel has pending resize, creating new channel...');

          // Close the problematic channel
          try {
            await closeChannel(currentChannelId);
            addLog('Old channel closed');
          } catch (closeErr) {
            addLog('Failed to close channel (may already be closed)', { error: String(closeErr) });
          }

          // Clear localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('yellow_channel_id');
          }
          setChannel(null);

          // Create new channel (includes 10 second wait for indexing)
          currentChannelId = await createChannelAndWait();
          createdNewChannel = true;
          addLog('New channel ready for resize', { channelId: currentChannelId });

          await resizeChannel(currentChannelId);
          addLog('Resize complete: Funds moved to unified balance after recreation');
        }
        // Handle "channel not found" error
        else if (errorMsg.includes('not found') || errorMsg.includes('channel')) {
          addLog('Channel not found, creating new channel...');

          // Clear localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('yellow_channel_id');
          }
          setChannel(null);

          // Create new channel (includes 10 second wait for indexing)
          currentChannelId = await createChannelAndWait();
          createdNewChannel = true;

          await resizeChannel(currentChannelId);
          addLog('Resize complete: Funds moved to unified balance after creation');
        } else {
          throw error;
        }
      }

      // Note: We keep the channel open for future use (stored in localStorage)
      addLog('Transfer complete! Channel kept open for future use.');

      // Refresh ledger entries to show updated balance
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for server to process
      await refreshLedgerEntries();

      toast.success(`Added ${amount} USDC to trading balance!`);
    } catch (error) {
      console.error('Add to trading balance failed:', error);
      addLog('Add to trading balance failed', { error: String(error) });
      toast.error('Failed to add funds to trading balance');
      throw error;
    }
  }, [isAuthenticated, sessionKey, address, channel, sendMessage, addLog, refreshLedgerEntries, closeChannel]);

  // Context value
  const contextValue: YellowNetworkContextValue = {
    // State
    isConnected,
    isAuthenticated,
    connectionStatus,
    sessionKey,
    channel,
    unifiedBalances,
    ledgerEntries,
    activityLog,

    // Actions
    connect,
    disconnect,
    resetSession,
    createChannel,
    fundChannel,
    closeChannel,
    requestFaucet,
    clearActivityLog,
    depositToCustody,
    addToTradingBalance,
    refreshLedgerEntries,

    // Exposed refs
    nitroliteClient: nitroliteClientRef.current,
  };

  return (
    <YellowNetworkContext.Provider value={contextValue}>
      {children}
    </YellowNetworkContext.Provider>
  );
}

// Custom hook to use the context
export function useYellowNetwork(): YellowNetworkContextValue {
  const context = useContext(YellowNetworkContext);
  if (context === undefined) {
    throw new Error('useYellowNetwork must be used within a YellowNetworkProvider');
  }
  return context;
}
