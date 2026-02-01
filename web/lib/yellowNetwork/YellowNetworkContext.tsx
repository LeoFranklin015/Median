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
import { baseSepolia } from 'wagmi/chains';
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
  StateIntent,
} from '@erc7824/nitrolite';

import type {
  YellowNetworkContextValue,
  SessionKey,
  ChannelInfo,
  ActivityLogEntry,
  ConnectionStatus,
  CloseChannelResolver,
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
    resolve: (channel: ChannelInfo) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const fundChannelResolverRef = useRef<{
    resolve: (balance: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
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
        }
        // Handle channel creation response
        else if (response.method === 'create_channel') {
          const { channelId: newChannelId, channel: channelData, state, serverSignature } = response.params;
          console.log('Channel created:', newChannelId);

          const channelInfo: ChannelInfo = {
            channelId: newChannelId,
            balance: '0',
            token: YELLOW_CONFIG.testToken,
            chainId: YELLOW_CONFIG.chainId,
            createdAt: Date.now(),
          };

          setChannel(channelInfo);

          // Register with Nitrolite client if available
          if (nitroliteClientRef.current) {
            try {
              const unsignedInitialState = {
                intent: state.intent,
                version: BigInt(state.version),
                data: state.stateData,
                allocations: state.allocations.map((a: any) => ({
                  destination: a.destination,
                  token: a.token,
                  amount: BigInt(a.amount),
                })),
              };

              await nitroliteClientRef.current.createChannel({
                channel: {
                  ...channelData,
                  challenge: BigInt(channelData.challenge),
                  nonce: BigInt(channelData.nonce),
                },
                unsignedInitialState,
                serverSignature,
              });
              addLog('Channel registered with Nitrolite client');
            } catch (error) {
              console.warn('Failed to register channel with Nitrolite:', error);
              addLog('Channel registration skipped', { error: String(error) });
            }
          }

          addLog('Channel created successfully', { channelId: newChannelId });
          toast.success('Channel created!');

          // Resolve promise if waiting
          if (createChannelResolverRef.current) {
            createChannelResolverRef.current.resolve(channelInfo);
            createChannelResolverRef.current = null;
          }
        }
        // Handle resize response
        else if (response.method === 'resize_channel') {
          console.log('Channel funded:', response.params);
          addLog('Channel funded', response.params);
          toast.success('Channel funded successfully!');

          const totalBalance = response.params.state.allocations.reduce(
            (sum: bigint, alloc: any) => sum + BigInt(alloc.amount),
            BigInt(0)
          );

          const newBalance = totalBalance.toString();
          setChannel((prev) => (prev ? { ...prev, balance: newBalance } : null));

          // Resolve promise if waiting
          if (fundChannelResolverRef.current) {
            fundChannelResolverRef.current.resolve(newBalance);
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
      if (chain?.id !== baseSepolia.id) {
        setConnectionStatus('switching_chain');
        addLog('Switching to Base Sepolia...');
        try {
          await switchChain({ chainId: baseSepolia.id });
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

  // Context value
  const contextValue: YellowNetworkContextValue = {
    // State
    isConnected,
    isAuthenticated,
    connectionStatus,
    sessionKey,
    channel,
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
