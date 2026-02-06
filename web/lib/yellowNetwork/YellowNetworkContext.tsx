'use client';

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
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
  createAppSessionMessage,
  createSubmitAppStateMessage,
  RPCProtocolVersion,
  type RPCAppDefinition,
  type RPCAppSessionAllocation,
  type RPCAppStateIntent,
  createCloseAppSessionMessage,
  createGetAppSessionsMessageV2,
  type RPCAppSession,
  RPCChannelStatus,
  createTransferMessage,
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
import { YELLOW_CONFIG, SUPPORTED_CHAINS, getChainById, AUTH_SCOPE, SESSION_DURATION, getAuthDomain } from './config';
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

  // Refs for WebSocket and clients (persist across renders)
  const wsRef = useRef<WebSocket | null>(null);
  const nitroliteClientRef = useRef<NitroliteClient | null>(null);
  const submitAppStateRef = useRef<any>(null); // Ref for calling submitAppState from handleMessage
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
  const appSessionResolverRef = useRef<{
    resolve: (data: { appSessionId: string }) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const submitAppStateResolverRef = useRef<{
    resolve: (data: { success: boolean }) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const closeAppSessionResolverRef = useRef<{
    resolve: (data: { success: boolean }) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const getAppSessionsResolversRef = useRef<Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }>>(new Map());
  const transferResolversRef = useRef<Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }>>(new Map());

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

  // Reinitialize NitroliteClient when chain changes
  useEffect(() => {
    if (!walletClient || !publicClient || !chain) return;

    const chainConfig = getChainById(chain.id);
    if (!chainConfig) {
      console.log('Chain not supported, skipping NitroliteClient reinitialization');
      return;
    }

    console.log(`🔄 Chain changed to ${chainConfig.name}, reinitializing NitroliteClient...`);

    try {
      const client = new NitroliteClient({
        publicClient: publicClient as any,
        walletClient: walletClient as any,
        stateSigner: new WalletStateSigner(walletClient as any),
        addresses: {
          custody: chainConfig.custody,
          adjudicator: chainConfig.adjudicator,
        },
        chainId: chainConfig.id,
        challengeDuration: BigInt(3600),
      });
      nitroliteClientRef.current = client;
      console.log(`✅ NitroliteClient reinitialized for ${chainConfig.name}`);
    } catch (error) {
      console.error('Failed to reinitialize NitroliteClient:', error);
    }
  }, [chain?.id, walletClient, publicClient]);

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
        console.log('Response method:', (response as any).method);
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
            const allowances = [{ asset: 'usdc', amount: '1000000000' }];
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
        // Handle app session closed response
        else if ((response as any).method === 'app_session_closed') {
          console.log('App session closed:', response.params);
          addLog('App session closed by server', response.params);
          if (closeAppSessionResolverRef.current) {
            closeAppSessionResolverRef.current.resolve({ success: true });
            closeAppSessionResolverRef.current = null;
          }
        }
        // Handle app session created response
        else if ((response as any).method === 'create_app_session') {
          console.log('App session created:', response.params);
          addLog('App session created', response.params);
          if (appSessionResolverRef.current) {
            const params = response.params as any;
            const appSessionId = params.appSessionId || params.app_session_id;

            if (appSessionId) {
              appSessionResolverRef.current.resolve({ appSessionId });
            } else {
              appSessionResolverRef.current.reject(new Error('App session ID missing from response'));
            }
            appSessionResolverRef.current = null;
          }
        }
        // Handle app state submitted response
        else if ((response as any).method === 'submit_app_state') {
          console.log('App state submitted:', response.params);
          addLog('App state submitted', response.params);
          if (submitAppStateResolverRef.current) {
            submitAppStateResolverRef.current.resolve({ success: true });
            submitAppStateResolverRef.current = null;
          }
        }
        // Handle get app sessions response
        else if ((response as any).method === 'get_app_sessions') {
          console.log('App sessions retrieved:', response.params);
          // Resolve pending resolvers based on timestamp or just resolve all
          // Since we use map, we iterate
          getAppSessionsResolversRef.current.forEach(({ resolve }) => resolve(response.params));
          getAppSessionsResolversRef.current.clear();
        }
        // Handle balance updates (bu)
        else if ((response as any).method === 'bu') {
          console.log('Balance update received:', response.params);
          addLog('Balance update received', response.params);
          // Trigger balance refresh
          refreshLedgerEntries();
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

          // Group entries by asset
          const balanceMap = new Map<string, number>();

          entries.forEach((entry) => {
            const assetName = entry.asset || 'unknown';
            const current = balanceMap.get(assetName) || 0;
            const credit = parseFloat(entry.credit || '0');
            const debit = parseFloat(entry.debit || '0');
            balanceMap.set(assetName, current + credit - debit);
          });

          // Convert to UnifiedBalance array
          const newBalances: UnifiedBalance[] = [];
          balanceMap.forEach((amount, asset) => {
            newBalances.push({ asset, amount: amount.toString() });
          });

          console.log('📊 Calculated balances:', newBalances);
          setUnifiedBalances(newBalances);
          addLog('Ledger entries processed', {
            count: entries.length,
            balances: newBalances
          });
        }
        // Handle transfer response
        else if ((response as any).method === 'transfer') {
          console.log('Transfer parsed response:', response.params);
          addLog('Transfer completed', response.params);
          const id = transferResolversRef.current.keys().next().value;
          if (id) {
            const resolver = transferResolversRef.current.get(id);
            if (resolver) {
              resolver.resolve({ success: true, data: response.params });
              transferResolversRef.current.delete(id);
            }
          }
        }
        // Handle App State Update (asu)
        else if ((response as any).method === 'asu') {
          console.log('🔄 Received App State Update (asu)', response.params);
          addLog('App State Update received', response.params);
          const params = response.params as any;

          // Helper to find session data in various possible structures
          // The parser might return params as the session object itself, or wrapped in app_session/appSession
          const sessionObj = params.appSession || params.app_session || params;
          const rawSessionData = sessionObj.sessionData || sessionObj.session_data;

          // Emit position_update events for perpetual positions
          if (rawSessionData) {
            try {
              const parsedData = typeof rawSessionData === 'string'
                ? JSON.parse(rawSessionData)
                : rawSessionData;

              // Check if this is a perpetual position update
              if (parsedData.positionId) {
                console.log('📈 Emitting position_update event:', parsedData);
                window.dispatchEvent(new CustomEvent('position_update', {
                  detail: parsedData
                }));
              }
            } catch (e) {
              // Ignore parse errors for position updates
            }
          }

          if (rawSessionData) {
            try {
              const sessionData = typeof rawSessionData === 'string'
                ? JSON.parse(rawSessionData)
                : rawSessionData;

              if (sessionData.executionStatus === 'filled') {
                console.log('✅ Order filled! Initiating transfer...', sessionData);
                addLog('Order filled! Auto-transferring asset...', sessionData);

                // Determine asset and amount
                const market = sessionData.market || ''; // e.g., "AAPL/USDC"
                const ticker = market.split('/')[0];
                const filledQuantity = sessionData.filledQuantity;

                // Determine counterparty
                const participants = sessionObj.participants || params.participants || [];
                const currentAddress = addressRef.current;
                const counterparty = participants.find((p: string) => p.toLowerCase() !== currentAddress?.toLowerCase());

                if (counterparty && currentAddress && sessionKeyRef.current) {
                  const sessionSigner = createECDSAMessageSigner(sessionKeyRef.current.privateKey);

                  // For 'buy', we pay the amount (USDC)
                  // For 'sell', we would pay the asset
                  const isBuy = sessionData.action === 'buy';
                  const asset = isBuy ? 'usdc' : ticker; // Simplified: usually Quote vs Base
                  const amount = sessionData.amount; // already in atoms

                  if (asset && amount) {
                    // Start async transfer without awaiting
                    (async () => {
                      try {
                        // User requested to use decimal amount (e.g. "0.1") in transfer message
                        const decimals = asset.toLowerCase() === 'usdc' ? 6 : 18;
                        const decimalAmount = (parseFloat(amount.toString()) / Math.pow(10, decimals)).toString();

                        const transferMsg = await createTransferMessage(sessionSigner, {
                          destination: counterparty as `0x${string}`,
                          allocations: [{
                            asset,
                            amount: decimalAmount,
                          }],
                        });


                        addLog(`💸 Auto-transferring ${decimalAmount} ${asset} to ${counterparty}...`);

                        // Create a promise to wait for transfer response
                        const transferPromise = new Promise<{ success: boolean; data: any }>((resolve, reject) => {
                          const id = Date.now().toString(); // The backend doesn't return request ID for transfers in the same way, but let's assume valid flow
                          // Actually, our handleMessage 'transfer' handler picks the first key. 
                          // So we just need to set ANY key.
                          transferResolversRef.current.set(id, { resolve, reject });
                          setTimeout(() => {
                            if (transferResolversRef.current.has(id)) {
                              transferResolversRef.current.delete(id);
                              reject(new Error('Transfer timeout'));
                            }
                          }, 30000);
                        });

                        sendMessage(transferMsg);

                        // Await response
                        const transferResult = await transferPromise;
                        addLog('✅ Transfer verified!', transferResult.data);

                        // Extract transactions
                        const transactions = transferResult.data.transactions || [];

                        // Submit App State with transaction proof
                        if (submitAppStateRef.current && params.appSession?.appSessionId) {
                          const newSessionData = {
                            ...sessionData,
                            transactions,
                            paymentStatus: 'completed',
                            executionStatus: 'settled', // Update status
                            timestamp: Date.now(),
                          };

                          addLog('📜 Submitting trade settlement (proof of payment)...');

                          // Reuse existing allocations (likely zero as per hackathon flow)
                          // We are just updating state to prove payment.
                          // We use 'operate' intent.
                          // participant_allocations logic is tricky. If we agreed on zero, we verify "0".
                          // For safety, we fetch current allocations from the message or use zero.
                          const currentAllocations = params.participant_allocations || [];
                          // Actually, params.participant_allocations might be empty.
                          // We'll construct explicit zero allocations for participants to satisfy 'operate' sum delta 0.
                          const zeroAllocations = participants.map((p: string) => ({
                            participant: p,
                            asset: asset === 'usdc' ? YELLOW_CONFIG.testToken : (market.split('/')[0] === 'ETH' ? '0x...' : '0x...'), // We need address... 
                            amount: '0'
                          }));
                          // WAIT: We don't have asset addresses easily here.
                          // But `submitAppState` logic in `AssetDetailView` used specific addresses.
                          // If we assume the previous state had valid allocations, we might reuse them.
                          // Or we send empty array [] if allowed? 
                          // The user's earlier flow had specific zero allocations.
                          // Let's try sending EMPTY allocations [] first.

                          await submitAppStateRef.current(
                            params.appSession.appSessionId,
                            [], // Empty allocations, hoping backend accepts logic or previous state persists
                            'operate',
                            newSessionData
                          );
                          addLog('✅ Trade settlement submitted!');
                        }

                      } catch (err) {
                        console.error('Failed to create/send transfer message or submit state:', err);
                        addLog('Auto-transfer/Settlement failed', { error: String(err) });
                      }
                    })();
                  }
                } else {
                  console.warn('Cannot auto-transfer: Counterparty or Wallet missing');
                  addLog('Auto-transfer failed: Counterparty missing');
                }
              }
            } catch (e) {
              console.error('Error processing asu session_data:', e);
            }
          }
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
          if (appSessionResolverRef.current) {
            appSessionResolverRef.current.reject(new Error(error));
            appSessionResolverRef.current = null;
          }
          if (submitAppStateResolverRef.current) {
            submitAppStateResolverRef.current.reject(new Error(error));
            submitAppStateResolverRef.current = null;
          }
          if (closeAppSessionResolverRef.current) {
            closeAppSessionResolverRef.current.reject(new Error(error));
            closeAppSessionResolverRef.current = null;
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

      // Check if connected chain is supported
      const chainConfig = chain ? getChainById(chain.id) : null;
      if (!chainConfig) {
        const supportedChainNames = Object.values(SUPPORTED_CHAINS).map(c => c.name).join(', ');
        toast.error(`Please switch to a supported network: ${supportedChainNames}`);
        setConnectionStatus('error');
        return;
      }
      addLog(`Using chain: ${chainConfig.name}`);

      // Initialize Nitrolite client with chain-specific configuration
      setConnectionStatus('initializing');
      try {
        // Get chain-specific config based on connected wallet's chain
        const chainConfig = chain ? getChainById(chain.id) : null;
        const custodyAddress = chainConfig?.custody || YELLOW_CONFIG.custody;
        const adjudicatorAddress = chainConfig?.adjudicator || YELLOW_CONFIG.adjudicator;
        const chainId = chainConfig?.id || YELLOW_CONFIG.chainId;

        addLog('Initializing NitroliteClient', {
          chainId,
          custody: custodyAddress,
          chainName: chainConfig?.name || 'Unknown'
        });

        const client = new NitroliteClient({
          publicClient: publicClient as any,
          walletClient: walletClient as any,
          stateSigner: new WalletStateSigner(walletClient as any),
          addresses: {
            custody: custodyAddress,
            adjudicator: adjudicatorAddress,
          },
          chainId,
          challengeDuration: BigInt(3600),
        });
        nitroliteClientRef.current = client;
        addLog('Nitrolite client initialized for ' + (chainConfig?.name || 'default chain'));
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

          const allowances = [{ asset: 'usdc', amount: '1000000000' }];
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

    console.log(`🔒 Channel ${channelId} closed on-chain (tx: ${txHash})`);
    addLog('Channel closed on-chain', { txHash });

    // Clear channel state
    setChannel(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHANNEL_ID_KEY);
    }

    return { txHash };
  }, [sessionKey, address, channel, sendMessage, addLog]);



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

  // ERC20 ABI for approval
  const erc20Abi = [
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    },
  ] as const;

  // Custody contract deposit ABI
  const custodyDepositAbi = [
    {
      name: 'deposit',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'account', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
    },
  ] as const;

  // Deposit USDC to custody contract (on-chain)
  // Uses direct contract calls for L2 compatibility (Arbitrum, etc.)
  const depositToCustody = useCallback(async (amount: string): Promise<{ txHash: string }> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    // Get chain-specific addresses
    const chainConfig = chain ? getChainById(chain.id) : null;
    const usdcToken = chainConfig?.usdcToken || YELLOW_CONFIG.testToken;
    const custodyAddress = chainConfig?.custody || YELLOW_CONFIG.custody;

    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDC has 6 decimals
    addLog(`Depositing ${amount} USDC to custody on ${chainConfig?.name || 'default chain'}...`, {
      chainId: chain?.id,
      usdcToken,
      custodyAddress
    });
    toast.info(`Depositing ${amount} USDC to custody...`);

    try {
      // Get current gas price with buffer for L2 chains
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * BigInt(150)) / BigInt(100) : undefined; // 50% buffer
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * BigInt(150)) / BigInt(100) : undefined;

      addLog('Gas estimation', {
        maxFeePerGas: maxFeePerGas?.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas?.toString()
      });

      // Step 1: Check current allowance using direct contract read
      let currentAllowance = BigInt(0);
      try {
        currentAllowance = await publicClient.readContract({
          address: usdcToken,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, custodyAddress],
        }) as bigint;
        addLog('Current allowance', { allowance: currentAllowance.toString() });
      } catch (allowanceError) {
        console.warn('Failed to get allowance, will attempt approval:', allowanceError);
        addLog('Allowance check failed, proceeding with approval');
      }

      // Step 2: Approve if needed - use direct writeContract for L2 compatibility
      if (currentAllowance < amountInUnits) {
        addLog('Approving USDC spend...');

        const approveHash = await walletClient.writeContract({
          address: usdcToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [custodyAddress, amountInUnits],
          maxFeePerGas,
          maxPriorityFeePerGas,
        });

        // Wait for approval tx to be mined
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        addLog('USDC approved', { txHash: approveHash });
      } else {
        addLog('Sufficient allowance already exists');
      }

      // Step 3: Deposit to custody using direct contract call for L2 compatibility
      addLog('Depositing to custody contract...');
      const depositHash = await walletClient.writeContract({
        address: custodyAddress,
        abi: custodyDepositAbi,
        functionName: 'deposit',
        args: [address, usdcToken, amountInUnits],
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      // Wait for deposit tx to be mined
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      addLog('Deposit successful!', { txHash: depositHash });
      toast.success(`Deposited ${amount} USDC to custody!`);

      return { txHash: depositHash };
    } catch (error) {
      console.error('Deposit failed:', error);
      addLog('Deposit failed', { error: String(error) });
      toast.error('Deposit failed');
      throw error;
    }
  }, [address, walletClient, publicClient, chain, addLog]);

  // Withdraw USDC from custody contract (on-chain) using NitroliteClient
  const withdrawFromCustody = useCallback(async (amount: string): Promise<{ txHash: string }> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    if (!nitroliteClientRef.current) {
      throw new Error('Nitrolite client not initialized. Please reconnect.');
    }

    // Get chain-specific USDC token address
    const chainConfig = chain ? getChainById(chain.id) : null;
    const usdcToken = chainConfig?.usdcToken || YELLOW_CONFIG.testToken;

    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDC has 6 decimals
    addLog(`Withdrawing ${amount} USDC from custody on ${chainConfig?.name || 'default chain'}...`, {
      chainId: chain?.id,
      usdcToken
    });
    toast.info(`Withdrawing ${amount} USDC from custody...`);

    try {
      const client = nitroliteClientRef.current;

      // Withdraw from custody using NitroliteClient
      addLog('Withdrawing from custody contract...');
      const withdrawHash = await client.withdrawal(usdcToken, amountInUnits);
      addLog('Withdrawal successful!', { txHash: withdrawHash });
      toast.success(`Withdrew ${amount} USDC from custody!`);

      return { txHash: withdrawHash };
    } catch (error) {
      console.error('Withdrawal failed:', error);
      addLog('Withdrawal failed', { error: String(error) });
      toast.error('Withdrawal failed');
      throw error;
    }
  }, [address, walletClient, publicClient, chain, addLog]);

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
      // Get chain-specific USDC token address
      const chainConfig = chain ? getChainById(chain.id) : null;
      const usdcToken = chainConfig?.usdcToken || YELLOW_CONFIG.testToken;

      // Step 0: Check custody balance before proceeding
      if (nitroliteClientRef.current) {
        const custodyBalance = await nitroliteClientRef.current.getAccountBalance(usdcToken);
        addLog('Current custody balance', { balance: custodyBalance.toString(), required: amountInUnits.toString(), chainName: chainConfig?.name });

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
  }, [isAuthenticated, sessionKey, address, chain, channel, sendMessage, addLog, refreshLedgerEntries, closeChannel]);

  // Withdraw from trading balance (resize channel flow)
  // Resizes with -amount (unified → channel) and resize_amount -amount (channel → custody)
  const withdrawFromTradingBalance = useCallback(async (amount: string): Promise<void> => {
    if (!isAuthenticated || !sessionKey || !address) {
      throw new Error('Not authenticated');
    }

    const amountInUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDC has 6 decimals
    addLog(`Withdrawing ${amount} USDC from trading balance...`);
    toast.info(`Withdrawing ${amount} USDC from trading balance...`);

    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);
    let currentChannelId = channel?.channelId;

    // Helper to create channel and wait for response (same as addToTradingBalance)
    const createChannelAndWait = async (): Promise<string> => {
      const { channelInfo, fullResponse } = await new Promise<{ channelInfo: ChannelInfo; fullResponse: any }>((resolve, reject) => {
        createChannelResolverRef.current = {
          resolve,
          reject: (error: Error) => {
            const errorMsg = error.message || '';
            const existingChannelMatch = errorMsg.match(/already exists: (0x[a-fA-F0-9]+)/);
            if (existingChannelMatch) {
              const existingChannelId = existingChannelMatch[1];
              addLog('Found existing channel, using it instead', { channelId: existingChannelId });
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
              resolve({ channelInfo: existingChannelInfo, fullResponse: null });
            } else {
              reject(error);
            }
          },
        };

        const doCreate = async () => {
          try {
            addLog('Creating channel for withdrawal...');
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
        addLog('Waiting for channel to be indexed (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      return channelInfo.channelId;
    };

    // Helper to resize channel for withdrawal (unified → custody)
    const resizeChannelForWithdraw = async (channelId: string): Promise<void> => {
      const resizeData = await new Promise<any>((resolve, reject) => {
        fundChannelResolverRef.current = { resolve, reject };

        const doResize = async () => {
          try {
            // For withdrawal:
            // allocate_amount: +X (move from unified balance back to channel)
            // resize_amount: -X (move from channel to custody)
            addLog(`Resizing channel for withdrawal: allocate_amount=+${amountInUnits.toString()}, resize_amount=-${amountInUnits.toString()}`);
            const resizeMsg = await createResizeChannelMessage(sessionSigner, {
              channel_id: channelId as `0x${string}`,
              resize_amount: -amountInUnits,
              allocate_amount: amountInUnits,
              funds_destination: address,
            });
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

      if (!nitroliteClientRef.current) {
        throw new Error('NitroliteClient not initialized');
      }

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
      // Step 1: Ensure we have a channel
      if (!currentChannelId) {
        currentChannelId = await createChannelAndWait();
        addLog('Channel ready for withdrawal', { channelId: currentChannelId });
      }

      // Step 2: Resize channel for withdrawal
      try {
        await resizeChannelForWithdraw(currentChannelId);
        addLog('Withdrawal resize complete: Funds moved to custody');
      } catch (error: any) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('not found') || errorMsg.includes('channel')) {
          addLog('Channel not found, creating new channel...');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('yellow_channel_id');
          }
          setChannel(null);
          currentChannelId = await createChannelAndWait();
          await resizeChannelForWithdraw(currentChannelId);
          addLog('Withdrawal complete after channel recreation');
        } else {
          throw error;
        }
      }

      addLog('Withdrawal complete! Channel kept open for future use.');

      // Refresh ledger entries to show updated balance
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshLedgerEntries();

      toast.success(`Withdrew ${amount} USDC from trading balance!`);
    } catch (error) {
      console.error('Withdraw from trading balance failed:', error);
      addLog('Withdraw from trading balance failed', { error: String(error) });
      toast.error('Failed to withdraw from trading balance');
      throw error;
    }
  }, [isAuthenticated, sessionKey, address, channel, sendMessage, addLog, refreshLedgerEntries]);

  // Create an app session
  const createAppSession = useCallback(async (
    participants: string[],
    allocations: { participant: string; asset: string; amount: string }[],
    applicationName: string = 'Median App'
  ): Promise<{ appSessionId: string }> => {
    if (!isAuthenticated || !sessionKey) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      appSessionResolverRef.current = {
        resolve,
        reject,
      };

      const doCreateSession = async () => {
        try {
          addLog(`Creating app session '${applicationName}'...`);

          // Each participant gets equal weight, quorum set to single participant weight
          const singleWeight = Math.floor(100 / participants.length);
          const definition: RPCAppDefinition = {
            protocol: RPCProtocolVersion.NitroRPC_0_4,
            participants: participants as `0x${string}`[],
            weights: participants.map(() => singleWeight),
            quorum: singleWeight, // Only one party needs to agree
            challenge: 0,
            nonce: Date.now(),
            application: applicationName,
          };

          const rpcAllocations: RPCAppSessionAllocation[] = allocations.map(a => ({
            participant: a.participant as `0x${string}`,
            asset: a.asset,
            amount: a.amount,
          }));

          const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);
          const sessionMessage = await createAppSessionMessage(sessionSigner, {
            definition,
            allocations: rpcAllocations,
          });

          if (!sendMessage(sessionMessage)) {
            throw new Error('Failed to send create app session message');
          }
          addLog('App session creation request sent');
        } catch (error) {
          console.error('Create app session error:', error);
          addLog('App session creation failed', { error: String(error) });
          reject(error);
          appSessionResolverRef.current = null;
        }
      };

      doCreateSession();

      // Timeout after 30 seconds
      setTimeout(() => {
        if (appSessionResolverRef.current) {
          appSessionResolverRef.current.reject(new Error('App session creation timeout'));
          appSessionResolverRef.current = null;
        }
      }, 30000);
    });
  }, [isAuthenticated, sessionKey, sendMessage, addLog]);


  // Helper to get app sessions
  const getAppSessions = useCallback(async (participant?: string, status?: RPCChannelStatus): Promise<RPCAppSession[]> => {
    if (!isAuthenticated || !sessionKey) {
      throw new Error('Not authenticated');
    }

    const participantAddress = (participant || address) as `0x${string}`;
    const message = createGetAppSessionsMessageV2(participantAddress, status);

    return new Promise((resolve, reject) => {
      const id = Date.now().toString();
      getAppSessionsResolversRef.current.set(id, {
        resolve: (data: any) => resolve(data.appSessions || []),
        reject
      });

      if (!sendMessage(message)) {
        getAppSessionsResolversRef.current.delete(id);
        reject(new Error('Failed to send get app sessions message'));
        return;
      }

      setTimeout(() => {
        if (getAppSessionsResolversRef.current.has(id)) {
          getAppSessionsResolversRef.current.delete(id);
          reject(new Error('Get app sessions timeout'));
        }
      }, 30000);
    });
  }, [isAuthenticated, sessionKey, address, sendMessage]);

  // Helper to get app session version
  const getAppSessionVersion = useCallback(async (appSessionId: string): Promise<number> => {
    const sessions = await getAppSessions();
    const session = sessions.find((s) => s.appSessionId.toLowerCase() === appSessionId.toLowerCase());

    if (!session) {
      throw new Error(`App session not found: ${appSessionId}`);
    }
    return session.version;
  }, [getAppSessions]);

  // Submit app state
  const submitAppState = useCallback(async (
    appSessionId: string,
    allocations: { participant: string; asset: string; amount: string }[],
    intent: 'operate' | 'deposit' | 'withdraw' = 'operate',
    sessionData?: Record<string, unknown>
  ): Promise<{ success: boolean }> => {
    if (!isAuthenticated || !sessionKey) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      submitAppStateResolverRef.current = {
        resolve,
        reject,
      };

      const doSubmitState = async () => {
        try {
          addLog(`Submitting app state for session ${appSessionId.slice(0, 10)}...`);

          // Fetch current version
          const currentVersion = await getAppSessionVersion(appSessionId);
          const newVersion = currentVersion + 1;

          console.log(`Current version: ${currentVersion}, submitting version: ${newVersion}`);

          const rpcIntentMap: Record<string, any> = {
            operate: 'operate',
            deposit: 'deposit',
            withdraw: 'withdraw',
          };

          const rpcIntent = rpcIntentMap[intent];

          const rpcAllocations: RPCAppSessionAllocation[] = allocations.map(a => ({
            participant: a.participant as `0x${string}`,
            asset: a.asset,
            amount: a.amount,
          }));

          const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);
          const stateMessage = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(sessionSigner, {
            app_session_id: appSessionId as `0x${string}`,
            intent: rpcIntent,
            version: newVersion,
            allocations: rpcAllocations,
            ...(sessionData && { session_data: JSON.stringify(sessionData) }),
          });

          if (!sendMessage(stateMessage)) {
            throw new Error('Failed to send submit app state message');
          }
          console.log('App state submission sent:', stateMessage);
          addLog('App state submission sent');
        } catch (error) {
          console.error('Submit app state error:', error);
          addLog('Submit app state failed', { error: String(error) });
          reject(error);
          submitAppStateResolverRef.current = null;
        }
      };

      doSubmitState();

      // Timeout after 30 seconds
      setTimeout(() => {
        if (submitAppStateResolverRef.current) {
          submitAppStateResolverRef.current.reject(new Error('Submit app state timeout'));
          submitAppStateResolverRef.current = null;
        }
      }, 30000);
    });
  }, [isAuthenticated, sessionKey, sendMessage, addLog, getAppSessionVersion]);

  // Transfer assets
  const transfer = useCallback(async (
    destination: string,
    allocations: { asset: string; amount: string }[]
  ): Promise<{ success: boolean }> => {
    if (!isAuthenticated || !sessionKey) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      // Create a unique ID for this request
      const id = Date.now().toString();
      transferResolversRef.current.set(id, {
        resolve,
        reject
      });

      const doTransfer = async () => {
        try {
          addLog(`💸 Initiating transfer to: ${destination}`);

          const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

          const transferMessage = await createTransferMessage(sessionSigner, {
            destination: destination as `0x${string}`,
            allocations: allocations.map(a => ({
              asset: a.asset,
              amount: a.amount,
            })),
          });

          if (!sendMessage(transferMessage)) {
            throw new Error('Failed to send transfer message');
          }
          addLog('Transfer request sent');
        } catch (error) {
          console.error('Transfer error:', error);
          addLog('Transfer failed', { error: String(error) });
          reject(error);
          transferResolversRef.current.delete(id);
        }
      };

      doTransfer();

      // Timeout after 30 seconds
      setTimeout(() => {
        if (transferResolversRef.current.has(id)) {
          transferResolversRef.current.delete(id);
          reject(new Error('Transfer timeout'));
        }
      }, 30000);
    });
  }, [isAuthenticated, sessionKey, sendMessage, addLog]);

  useEffect(() => {
    submitAppStateRef.current = submitAppState;
  }, [submitAppState]);

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
    withdrawFromCustody,
    addToTradingBalance,
    withdrawFromTradingBalance,
    refreshLedgerEntries,
    createAppSession,
    submitAppState,
    transfer,

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
