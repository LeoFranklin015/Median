'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, CheckCircle, ArrowLeft, Zap, Activity, DollarSign } from 'lucide-react';
import Link from 'next/link';
import {
  NitroliteClient,
  WalletStateSigner,
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createECDSAMessageSigner,
  createCreateChannelMessage,
  createResizeChannelMessage,
  parseAnyRPCResponse,
  RPCMethod,
  type AuthChallengeResponse,
  type AuthRequestParams,
} from '@erc7824/nitrolite';

// Session key type
interface SessionKey {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

// Session key utilities
const SESSION_KEY_STORAGE = 'median_yellow_session_key';

const generateSessionKey = (): SessionKey => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
};

const getStoredSessionKey = (): SessionKey | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_KEY_STORAGE);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SessionKey;
  } catch {
    return null;
  }
};

const storeSessionKey = (key: SessionKey): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(key));
};

// Authentication constants - must match backend exactly
const AUTH_SCOPE = 'Median App';
const SESSION_DURATION = 3600; // 1 hour

// EIP-712 domain for Yellow Network authentication
const getAuthDomain = () => ({
  name: AUTH_SCOPE,
});

// Yellow Network Base Sepolia configuration
const YELLOW_CONFIG = {
  ws: 'wss://yellow.philotheephilix.in/ws',
  faucet: 'https://clearnet-sandbox.yellow.com/faucet/requestTokens',
  custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const,
  adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as const,
  testToken: '0x036cbd53842c5426634e7929541ec2318f3dcf7e' as const, // USDC on Base Sepolia
  chainId: 84532, // Base Sepolia (supported by Yellow Network)
};

export default function YellowNetworkPage() {
  const [isClient, setIsClient] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const nitroliteClientRef = useRef<NitroliteClient | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const sessionExpireTimestampRef = useRef<string>('');

  // Refs to hold latest values for WebSocket handler
  const walletClientRef = useRef<any>(null);
  const addressRef = useRef<`0x${string}` | undefined>(undefined);

  // Session key state
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);

  // Wagmi hooks
  const { address, isConnected: isWalletConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Channel state
  const [channelId, setChannelId] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [channelBalance, setChannelBalance] = useState('0');

  // Funding state
  const [fundAmount, setFundAmount] = useState('20');
  const [isFunding, setIsFunding] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState<Array<{ time: string; message: string; data?: any }>>([]);

  // Keep refs updated with latest values
  useEffect(() => {
    walletClientRef.current = walletClient;
    addressRef.current = address;
  }, [walletClient, address]);

  // Initialize session key on mount
  useEffect(() => {
    setIsClient(true);

    // Get or generate session key
    const existingSessionKey = getStoredSessionKey();
    if (existingSessionKey) {
      setSessionKey(existingSessionKey);
      console.log('Using existing session key:', existingSessionKey.address);
    } else {
      const newSessionKey = generateSessionKey();
      storeSessionKey(newSessionKey);
      setSessionKey(newSessionKey);
      console.log('Generated new session key:', newSessionKey.address);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Only close on unmount
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        intentionalDisconnectRef.current = true;
        wsRef.current.close();
      }
    };
  }, []);

  const addLog = useCallback((message: string, data?: any) => {
    setActivityLog(prev => [{
      time: new Date().toLocaleTimeString(),
      message,
      data,
    }, ...prev].slice(0, 15));
  }, []);

  // Helper to safely stringify data with BigInt values
  const safeStringify = (data: any) => {
    return JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
  };

  const handleConnect = async () => {
    if (!walletClient || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!sessionKey) {
      toast.error('Session key not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionStatus('Initializing...');

      // Check if on Base Sepolia, switch if not
      if (chain?.id !== baseSepolia.id) {
        setConnectionStatus('Switching to Base Sepolia...');
        addLog('Switching to Base Sepolia...');
        try {
          await switchChain({ chainId: baseSepolia.id });
          // Wait a bit for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          toast.error('Please switch to Base Sepolia network');
          setIsConnecting(false);
          return;
        }
      }

      addLog('Wallet connected', { address, chain: walletClient.chain?.name });

      // Initialize Nitrolite client with wallet client
      setConnectionStatus('Creating Nitrolite client...');
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

      addLog('Wallet ready for Yellow Network', { address });
      setConnectionStatus('Connecting to Yellow Network...');

      // Generate expire timestamp for this session
      const expireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);
      sessionExpireTimestampRef.current = expireTimestamp;

      // Connect to WebSocket
      intentionalDisconnectRef.current = false;

      console.log('Creating WebSocket connection to:', YELLOW_CONFIG.ws);
      const ws = new WebSocket(YELLOW_CONFIG.ws);

      // Store reference immediately to prevent race conditions
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('🟢 WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('Authenticating...');
        addLog('WebSocket connected');

        try {
          // Get the current wallet client and address from refs
          const currentWalletClient = walletClientRef.current;
          const currentAddress = addressRef.current;

          if (!currentWalletClient || !currentAddress) {
            throw new Error('Wallet not available');
          }

          // Create auth request params matching the backend exactly
          const allowances = [{ asset: 'usdc', amount: '1' }];
          const authParams: AuthRequestParams = {
            address: currentAddress,
            session_key: sessionKey!.address,
            expires_at: BigInt(sessionExpireTimestampRef.current),
            scope: 'median.app',
            application: AUTH_SCOPE,
            allowances: allowances,
          };

          console.log('Auth params:', authParams);
          const authRequestMsg = await createAuthRequestMessage(authParams);

          console.log('Sending auth request:', authRequestMsg);
          ws.send(authRequestMsg);
          addLog('Auth request sent', { address: currentAddress });
        } catch (error) {
          console.error('Auth request error:', error);
          addLog('Auth request failed', { error: String(error) });
          toast.error('Authentication failed');
          setIsConnecting(false);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('Connection error');
        addLog('WebSocket error', { error: String(error) });
        toast.error('Connection failed');
        setIsConnecting(false);
      };

      ws.onmessage = async (event: MessageEvent) => {
        console.log('📨 Raw message:', event.data);

        try {
          const response = parseAnyRPCResponse(event.data);
          console.log('Parsed response:', response);
          addLog(`Received: ${response.method}`, response);

          // Get current values from refs
          const currentWalletClient = walletClientRef.current;
          const currentAddress = addressRef.current;

          // Handle auth challenge
          if (response.method === RPCMethod.AuthChallenge) {
            console.log('Received auth challenge');

            if (!currentWalletClient || !currentAddress) {
              console.error('Wallet not available for auth challenge');
              addLog('Auth challenge failed - wallet not available');
              toast.error('Wallet not available');
              return;
            }

            const challengeResponse = response as AuthChallengeResponse;

            setConnectionStatus('Signing challenge...');
            addLog('Signing auth challenge');

            try {
              // Auth params for EIP-712 signing - must match backend exactly
              const allowances = [{ asset: 'usdc', amount: '1' }];
              const authParams = {
                scope: 'median.app',
                application: currentAddress as `0x${string}`,
                participant: sessionKey!.address,
                expire: sessionExpireTimestampRef.current,
                allowances: allowances,
                session_key: sessionKey!.address,
                expires_at: BigInt(sessionExpireTimestampRef.current),
              };

              console.log('Auth params for EIP-712:', authParams);

              // Create EIP-712 signer with wallet client
              const eip712Signer = createEIP712AuthMessageSigner(
                currentWalletClient,
                authParams,
                getAuthDomain()
              );

              // Create and send auth verify message
              const authVerifyPayload = await createAuthVerifyMessage(
                eip712Signer,
                challengeResponse
              );

              console.log('Auth verify payload:', authVerifyPayload);

              // Check if WebSocket is still open before sending
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(authVerifyPayload);
                addLog('Auth verification sent');
              } else {
                throw new Error('WebSocket closed during authentication');
              }
            } catch (error) {
              console.error('Auth challenge handling error:', error);
              addLog('Auth challenge failed', { error: String(error) });
              toast.error('Signature rejected or authentication failed');
              setIsConnecting(false);
            }
          }
          // Handle auth success
          else if (response.method === RPCMethod.AuthVerify) {
            console.log('✅ Authentication successful!');
            setIsAuthenticated(true);
            setConnectionStatus('Authenticated');
            setIsConnecting(false);
            addLog('Authentication successful! ✅');
            toast.success('Authenticated with Yellow Network!');
          }
          // Handle channel creation response
          else if (response.method === 'create_channel') {
            const { channelId: newChannelId, channel, state, serverSignature } = response.params;
            console.log('Channel created:', newChannelId);

            setChannelId(newChannelId);

            // Register channel with Nitrolite client
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

            // Register with Nitrolite client if available (optional)
            if (nitroliteClientRef.current) {
              try {
                await nitroliteClientRef.current.createChannel({
                  channel: {
                    ...channel,
                    challenge: BigInt(channel.challenge),
                    nonce: BigInt(channel.nonce),
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
            setIsCreatingChannel(false);
          }
          // Handle resize response
          else if (response.method === 'resize_channel') {
            console.log('Channel funded:', response.params);
            addLog('Channel funded', response.params);
            toast.success('Channel funded successfully!');
            setIsFunding(false);

            // Update balance from allocations
            const totalBalance = response.params.state.allocations.reduce(
              (sum: bigint, alloc: any) => sum + BigInt(alloc.amount),
              BigInt(0)
            );
            setChannelBalance(totalBalance.toString());
          }
          // Handle errors
          else if (response.method === RPCMethod.Error) {
            const error = response.params?.error || 'Unknown error';
            console.error('❌ Error from server:', error);
            console.error('Full error response:', response);
            addLog('Error received', {
              error,
              requestId: response.requestId,
              fullResponse: response
            });
            toast.error(`Server error: ${error}`);
            setIsConnecting(false);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
          addLog('Parse error', { raw: event.data, error: String(error) });
        }
      };

      ws.onclose = (event) => {
        const wasIntentional = intentionalDisconnectRef.current;
        console.log('🔴 Disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          intentional: wasIntentional
        });

        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionStatus('Disconnected');
        setIsConnecting(false);

        if (!wasIntentional) {
          addLog('Unexpected disconnect', {
            code: event.code,
            reason: event.reason || 'No reason provided',
            wasClean: event.wasClean
          });
          toast.error('Connection lost');
        } else {
          addLog('Disconnected from Yellow Network');
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect');
      setConnectionStatus('Failed');
      addLog('Connection failed', { error: String(error) });
      setIsConnecting(false);
    }
  };

  const handleRequestFaucet = async () => {
    if (!address) {
      toast.error('No wallet address');
      return;
    }

    try {
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
        toast.error('Faucet request failed');
      }
    } catch (error) {
      console.error('Faucet error:', error);
      addLog('Faucet error', { error: String(error) });
      toast.error('Failed to request faucet');
    }
  };

  const handleCreateChannel = async () => {
    if (!wsRef.current || !isAuthenticated || !sessionKey) {
      toast.error('Not authenticated');
      return;
    }

    try {
      setIsCreatingChannel(true);
      addLog('Creating channel...');

      // Create a signer using the session key (not wallet client)
      const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

      const createChannelMsg = await createCreateChannelMessage(sessionSigner, {
        chain_id: YELLOW_CONFIG.chainId,
        token: YELLOW_CONFIG.testToken,
      });

      console.log('Sending create channel:', createChannelMsg);
      wsRef.current.send(createChannelMsg);
      addLog('Channel creation request sent');
    } catch (error) {
      console.error('Create channel error:', error);
      addLog('Channel creation failed', { error: String(error) });
      toast.error('Failed to create channel');
      setIsCreatingChannel(false);
    }
  };

  const handleFundChannel = async () => {
    const currentAddress = addressRef.current;

    if (!wsRef.current || !channelId || !currentAddress || !sessionKey) {
      toast.error('Channel not ready');
      return;
    }

    try {
      setIsFunding(true);
      addLog(`Funding channel with ${fundAmount}...`);

      // Create a signer using the session key (not wallet client)
      const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

      const resizeMsg = await createResizeChannelMessage(sessionSigner, {
        channel_id: channelId as `0x${string}`,
        allocate_amount: BigInt(fundAmount),
        funds_destination: currentAddress,
      });

      console.log('Sending resize:', resizeMsg);
      wsRef.current.send(resizeMsg);
      addLog('Fund request sent', { amount: fundAmount });
    } catch (error) {
      console.error('Fund error:', error);
      addLog('Funding failed', { error: String(error) });
      toast.error('Failed to fund channel');
      setIsFunding(false);
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      intentionalDisconnectRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsAuthenticated(false);
    setChannelId('');
    setConnectionStatus('');
    nitroliteClientRef.current = null;
    addLog('Disconnected');
    toast.info('Disconnected');
  };

  // Wait for client-side hydration to prevent mismatch
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isWalletConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
        <main className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Yellow Network Integration</h1>
            <p className="text-muted-foreground">State channels for instant payments</p>
          </div>

          <Card className="shadow-2xl border-primary/10">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect your wallet to get started
                  </p>
                </div>
                <ConnectButton />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen from-background via-primary/5 to-primary/10 p-4">
      <main className="container mx-auto max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Yellow Network - Instant Payments</h1>
          <p className="text-muted-foreground">Nitrolite state channels on Sepolia testnet</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Connection & Authentication
                </CardTitle>
                <CardDescription>Connect to Yellow Network sandbox and authenticate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
                        <p className="text-sm font-mono break-all">{address}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${chain?.id === baseSepolia.id ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                        <p className="text-xs text-muted-foreground mb-1">Network</p>
                        <p className="text-sm font-medium">{chain?.name || 'Unknown'}</p>
                        {chain?.id !== baseSepolia.id && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Will switch to Base Sepolia when connecting
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting || !walletClient || !sessionKey}
                      className="w-full"
                      size="lg"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {connectionStatus}
                        </>
                      ) : !walletClient || !sessionKey ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading wallet...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Connect & Authenticate
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className={`p-4 rounded-lg border ${
                      isAuthenticated
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-amber-400" />
                        )}
                        <div className="flex-1">
                          <p className={`font-semibold ${
                            isAuthenticated
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-amber-900 dark:text-amber-100'
                          }`}>
                            {isAuthenticated ? 'Authenticated' : 'Authenticating...'}
                          </p>
                          <p className={`text-sm ${
                            isAuthenticated
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}>
                            {connectionStatus}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDisconnect}>
                          Disconnect
                        </Button>
                      </div>
                    </div>

                    {address && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                        <p className="text-xs font-mono break-all">{address}</p>
                      </div>
                    )}
                    {sessionKey && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Session Key</p>
                        <p className="text-xs font-mono break-all">{sessionKey.address}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Faucet Card */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Request Test Tokens
                  </CardTitle>
                  <CardDescription>Get test tokens in your Unified Balance (off-chain)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleRequestFaucet} className="w-full">
                    Request Faucet Tokens
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Channel Management */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle>Channel Management</CardTitle>
                  <CardDescription>Create and fund payment channels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!channelId ? (
                    <Button
                      onClick={handleCreateChannel}
                      disabled={isCreatingChannel}
                      className="w-full"
                    >
                      {isCreatingChannel ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Creating Channel...
                        </>
                      ) : (
                        'Create Payment Channel'
                      )}
                    </Button>
                  ) : (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Channel ID</p>
                        <p className="text-xs font-mono break-all">{channelId}</p>
                      </div>

                      <div>
                        <Label htmlFor="amount">Fund Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="20"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Allocates funds from Unified Balance to channel
                        </p>
                      </div>

                      <Button
                        onClick={handleFundChannel}
                        disabled={isFunding || !fundAmount}
                        className="w-full"
                      >
                        {isFunding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Funding...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Fund Channel
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Activity Log */}
          <div className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {activityLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                  ) : (
                    activityLog.map((log, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">{log.message}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                        </div>
                        {log.data && (
                          <pre className="text-xs text-muted-foreground overflow-x-auto max-h-32 overflow-y-auto">
                            {safeStringify(log.data)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
