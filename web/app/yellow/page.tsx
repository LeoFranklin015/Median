'use client';

import { useState, useEffect, useRef } from 'react';
import { ConnectWallet } from "@/components/ConnectWallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/circle-passkey/storage";
import { createSmartAccountFromPasskey } from "@/lib/circle-passkey/account";
import { baseSepolia } from 'viem/chains';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ArrowLeft, Zap, Activity, DollarSign } from 'lucide-react';
import Link from 'next/link';
import {
  NitroliteClient,
  WalletStateSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createECDSAMessageSigner,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createCloseChannelMessage,
  parseAnyRPCResponse
} from '@erc7824/nitrolite';
import { createPublicClient, createWalletClient, http, type WalletClient , type Account } from 'viem';


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
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [yellowWalletAddress, setYellowWalletAddress] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionKeyRef = useRef<string | null>(null);
  const sessionSignerRef = useRef<any>(null);
  const nitroliteClientRef = useRef<NitroliteClient | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const authDataRef = useRef<{
    authParams?: any;
    smartAccount?: any;
    walletClient?: any;
  }>({});

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

  useEffect(() => {
    setIsClient(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Show smart account address (will be used for Yellow Network)
    if (currentUser?.smartAccountAddress) {
      setYellowWalletAddress(currentUser.smartAccountAddress);
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

  const addLog = (message: string, data?: any) => {
    setActivityLog(prev => [{
      time: new Date().toLocaleTimeString(),
      message,
      data,
    }, ...prev].slice(0, 15));
  };

  // Helper to safely stringify data with BigInt values
  const safeStringify = (data: any) => {
    return JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
  };

  const handleConnect = async () => {
    if (!user?.credential) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionStatus('Initializing...');

      // Create smart account on Base Sepolia - will be used for ALL Yellow Network operations
      const { smartAccount, client: publicClient } = await createSmartAccountFromPasskey(user.credential, baseSepolia);

      addLog('Smart account created', { address: smartAccount.address, chain: 'Base Sepolia' });

      // Create wallet client with smart account
      const smartAccountWalletClient = createWalletClient({
        chain: baseSepolia,
        transport: http(),
        account: smartAccount,
      }) as WalletClient;

      // Store smart account address for use in operations
      sessionKeyRef.current = smartAccount.address;

      // Create message signer for smart account
      // This will use the smart account's signing method (WebAuthn/EIP-1271)
      const smartAccountSigner = async (payload: any): Promise<string> => {
        try {
          const message = JSON.stringify(payload);
          const signature = await smartAccount.signMessage({ message });
          console.log('Smart account signature:', signature, 'length:', signature.length);
          return signature as string;
        } catch (error) {
          console.error('Smart account signing failed:', error);
          throw error;
        }
      };

      sessionSignerRef.current = smartAccountSigner;

      // Initialize Nitrolite client with smart account
      setConnectionStatus('Creating Nitrolite client with smart account...');
      try {
        const client = new NitroliteClient({
          publicClient: publicClient as any,
          walletClient: smartAccountWalletClient as any,
          stateSigner: new WalletStateSigner(smartAccountWalletClient as any),
          addresses: {
            custody: YELLOW_CONFIG.custody,
            adjudicator: YELLOW_CONFIG.adjudicator,
          },
          chainId: YELLOW_CONFIG.chainId,
          challengeDuration: BigInt(3600),
        });

        nitroliteClientRef.current = client;
        addLog('Nitrolite client initialized with smart account');
      } catch (error) {
        console.warn('Nitrolite client initialization failed (non-critical):', error);
        addLog('Nitrolite client init failed (non-critical)', { error: String(error) });
      }

      addLog('Smart account ready for Yellow Network', {
        address: smartAccount.address,
        note: 'Using Circle Passkey smart account'
      });
      setConnectionStatus('Connecting to Yellow Network...');

      // Connect to WebSocket
      intentionalDisconnectRef.current = false;
      const ws = new WebSocket(YELLOW_CONFIG.ws);

      // Store reference immediately to prevent race conditions
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('🟢 WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('Authenticating...');
        addLog('WebSocket connected');

        try {
          // Send auth request using smart account
          // Smart account will sign all operations
          const authParams = {
            session_key: smartAccount.address as `0x${string}`, // Use smart account as session key
            allowances: [{ asset: 'usdc', amount: '1000000000' }],
            expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
            scope: 'circle-passkey-app',
          };

          const authRequestMsg = await createAuthRequestMessage({
            address: smartAccount.address, // Smart account address
            application: 'Circle Passkey Demo',
            ...authParams,
          });

          console.log('Sending auth request with smart account:', authRequestMsg);
          ws.send(authRequestMsg);
          addLog('Auth request sent', {
            smartAccount: smartAccount.address,
          });

          // Store auth data for challenge response
          authDataRef.current = {
            authParams,
            walletClient: smartAccountWalletClient,
          };
        } catch (error) {
          console.error('Auth request error:', error);
          addLog('Auth request failed', error);
          toast.error('Authentication failed');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('Connection error');
        addLog('WebSocket error', { error });
        toast.error('Connection failed');
      };

      ws.onmessage = async (event) => {
        console.log('📨 Raw message:', event.data);

        try {
          const response = parseAnyRPCResponse(event.data);
          console.log('Parsed response:', response);
          addLog(`Received: ${response.method}`, response);

          // Handle auth challenge
          if (response.method === 'auth_challenge') {
            console.log('Received auth challenge');

            // Use setTimeout to prevent blocking and allow WebSocket to stay open
            setTimeout(async () => {
              try {
                const challenge = response.params?.challengeMessage;
                const { authParams, walletClient } = authDataRef.current;

                if (!challenge || !authParams || !walletClient) {
                  throw new Error('Missing challenge or auth data');
                }

                setConnectionStatus('Signing challenge with smart account...');
                addLog('Signing auth challenge with smart account', { challenge });

                // Create EIP-712 signer with smart account
                // The smart account will produce a WebAuthn signature that Yellow Network should support via EIP-1271
                console.log('Auth params for EIP-712:', authParams);
                console.log('Smart account address:', walletClient.account.address);

                const eip712Signer = createEIP712AuthMessageSigner(
                  walletClient,
                  authParams,
                  { name: 'Yellow Network' }
                );

                const verifyMsg = await createAuthVerifyMessageFromChallenge(
                  eip712Signer,
                  challenge
                );

                // Parse the verify message to extract the signature
                try {
                  const parsedMsg = JSON.parse(verifyMsg);
                  console.log('Parsed auth verify message:', parsedMsg);
                  if (parsedMsg.sig && parsedMsg.sig[0]) {
                    const clientSig = parsedMsg.sig[0];
                    console.log('CLIENT SIGNATURE:', clientSig);
                    console.log('CLIENT SIGNATURE LENGTH:', clientSig.length);
                    console.log('CLIENT SIGNATURE BYTES:', (clientSig.length - 2) / 2);
                  }
                } catch (e) {
                  console.log('Could not parse verify message:', verifyMsg);
                }

                console.log('Auth verify message:', verifyMsg);
                console.log('Auth verify message length:', verifyMsg.length);

                console.log('Verification message created, checking WebSocket state...');
                console.log('WebSocket readyState:', wsRef.current?.readyState);

                // Check if WebSocket is still open before sending
                const currentWs = wsRef.current;
                if (currentWs && currentWs.readyState === WebSocket.OPEN) {
                  console.log('Sending verification with smart account signature:', verifyMsg);
                  currentWs.send(verifyMsg);
                  addLog('Auth verification sent (smart account signature)');
                } else {
                  const state = currentWs?.readyState === WebSocket.CONNECTING ? 'connecting' :
                               currentWs?.readyState === WebSocket.CLOSING ? 'closing' :
                               currentWs?.readyState === WebSocket.CLOSED ? 'closed' : 'undefined';
                  const error = `WebSocket is ${state}, cannot send verification`;
                  console.error(error);
                  addLog('Verification failed', { error, wsState: state });
                  toast.error('Connection closed during authentication');
                }
              } catch (error) {
                console.error('Auth challenge handling error:', error);
                addLog('Auth challenge failed', { error: String(error) });
                toast.error('Authentication challenge failed');
              }
            }, 0);
          }
          // Handle auth success
          else if (response.method === 'auth_verify') {
            console.log('✅ Authentication successful!');
            setIsAuthenticated(true);
            setConnectionStatus('Authenticated');
            addLog('Authentication successful! ✅');
            toast.success('Authenticated with Yellow Network!');
          }
          // Handle channel creation response
          else if (response.method === 'create_channel') {
            const { channelId, channel, state, serverSignature } = response.params;
            console.log('Channel created:', channelId);

            setChannelId(channelId);

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

            addLog('Channel created successfully', { channelId });
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
              (sum, alloc) => sum + alloc.amount,
              BigInt(0)
            );
            setChannelBalance(totalBalance.toString());
          }
          // Handle errors
          else if (response.method === 'error') {
            const error = response.params?.error || 'Unknown error';
            console.error('❌ Error from server:', error);
            console.error('Full error response:', response);
            addLog('Error received', {
              error,
              requestId: response.requestId,
              fullResponse: response
            });
            toast.error(`Server error: ${error}`);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
          addLog('Parse error', { raw: event.data, error });
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
      addLog('Connection failed', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRequestFaucet = async () => {
    if (!user?.smartAccountAddress) {
      toast.error('No wallet address');
      return;
    }

    try {
      addLog('Requesting faucet tokens...');
      toast.info('Requesting test tokens...');

      const response = await fetch(YELLOW_CONFIG.faucet, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: user.smartAccountAddress }),
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
      addLog('Faucet error', error);
      toast.error('Failed to request faucet');
    }
  };

  const handleCreateChannel = async () => {
    if (!wsRef.current || !sessionSignerRef.current || !isAuthenticated) {
      toast.error('Not authenticated');
      return;
    }

    try {
      setIsCreatingChannel(true);
      addLog('Creating channel...');

      const createChannelMsg = await createCreateChannelMessage(sessionSignerRef.current, {
        chain_id: YELLOW_CONFIG.chainId,
        token: YELLOW_CONFIG.testToken,
      });

      console.log('Sending create channel:', createChannelMsg);
      wsRef.current.send(createChannelMsg);
      addLog('Channel creation request sent');
    } catch (error) {
      console.error('Create channel error:', error);
      addLog('Channel creation failed', error);
      toast.error('Failed to create channel');
      setIsCreatingChannel(false);
    }
  };

  const handleFundChannel = async () => {
    if (!wsRef.current || !sessionSignerRef.current || !channelId || !user) {
      toast.error('Channel not ready');
      return;
    }

    try {
      setIsFunding(true);
      addLog(`Funding channel with ${fundAmount}...`);

      const resizeMsg = await createResizeChannelMessage(sessionSignerRef.current, {
        channel_id: channelId as `0x${string}`,
        allocate_amount: BigInt(fundAmount),
        funds_destination: user.smartAccountAddress,
      });

      console.log('Sending resize:', resizeMsg);
      wsRef.current.send(resizeMsg);
      addLog('Fund request sent', { amount: fundAmount });
    } catch (error) {
      console.error('Fund error:', error);
      addLog('Funding failed', error);
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
    sessionKeyRef.current = null;
    sessionSignerRef.current = null;
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
        <main className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Yellow Network Integration</h1>
            <p className="text-muted-foreground">State channels for instant payments with Circle Passkey</p>
          </div>

          <Card className="shadow-2xl border-primary/10">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                  <p className="text-sm text-muted-foreground">
                    Use biometrics to access your smart wallet
                  </p>
                </div>
                <ConnectWallet />
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
                        <p className="text-xs text-muted-foreground mb-1">Smart Account (On-chain)</p>
                        <p className="text-sm font-mono break-all">{user.smartAccountAddress}</p>
                      </div>
                      {yellowWalletAddress && (
                        <div className="p-3 bg-muted rounded-lg border-2 border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">Yellow Network Wallet (Smart Account)</p>
                          <p className="text-sm font-mono break-all">{yellowWalletAddress}</p>
                          <p className="text-xs text-muted-foreground mt-1">🔐 Circle Passkey smart account with EIP-1271</p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full"
                      size="lg"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {connectionStatus}
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

                    {sessionKeyRef.current && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Active Wallet</p>
                        <p className="text-xs font-mono break-all">{sessionKeyRef.current}</p>
                        <p className="text-xs text-muted-foreground mt-1">Smart account signing with WebAuthn/EIP-1271</p>
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
