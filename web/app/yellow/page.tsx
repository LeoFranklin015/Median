'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { base } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, CheckCircle, ArrowLeft, Zap, Activity, DollarSign, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useYellowNetwork } from '@/lib/yellowNetwork';

export default function YellowNetworkPage() {
  const [isClient, setIsClient] = useState(false);
  const [fundAmount, setFundAmount] = useState('20');
  const [closeChannelId, setCloseChannelId] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Wagmi hooks
  const { address, isConnected: isWalletConnected, chain } = useAccount();

  // Yellow Network hook - all state and actions from context
  const {
    isConnected,
    isAuthenticated,
    connectionStatus,
    sessionKey,
    channel,
    activityLog,
    connect,
    disconnect,
    resetSession,
    createChannel,
    fundChannel,
    closeChannel,
    requestFaucet,
  } = useYellowNetwork();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper to safely stringify data with BigInt values
  const safeStringify = (data: any) => {
    return JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleRequestFaucet = async () => {
    try {
      await requestFaucet();
    } catch (error) {
      console.error('Faucet error:', error);
      toast.error('Failed to request faucet');
    }
  };

  const handleCreateChannel = async () => {
    try {
      setIsCreatingChannel(true);
      await createChannel();
    } catch (error) {
      console.error('Create channel error:', error);
      toast.error('Failed to create channel');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleFundChannel = async () => {
    if (!fundAmount) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      setIsFunding(true);
      await fundChannel(fundAmount);
    } catch (error) {
      console.error('Fund error:', error);
      toast.error('Failed to fund channel');
    } finally {
      setIsFunding(false);
    }
  };

  const handleCloseChannel = async () => {
    const targetChannelId = closeChannelId.trim();
    if (!targetChannelId) {
      toast.error('Please enter a channel ID to close');
      return;
    }

    try {
      setIsClosing(true);
      const result = await closeChannel(targetChannelId);
      toast.success(`Channel closed! TX: ${result.txHash.slice(0, 10)}...`);
      setCloseChannelId(''); // Clear input after success
    } catch (error) {
      console.error('Close channel error:', error);
      toast.error('Failed to close channel');
    } finally {
      setIsClosing(false);
    }
  };

  const handleResetSession = () => {
    resetSession();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Get connection status display
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'switching_chain':
        return 'Switching to Base mainnet...';
      case 'initializing':
        return 'Initializing client...';
      case 'authenticating':
        return 'Authenticating...';
      case 'signing':
        return 'Signing challenge...';
      case 'authenticated':
        return 'Authenticated';
      case 'error':
        return 'Connection error';
      default:
        return 'Disconnected';
    }
  };

  const isConnecting = ['connecting', 'switching_chain', 'initializing', 'authenticating', 'signing'].includes(connectionStatus);

  // Wait for client-side hydration
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
          <p className="text-muted-foreground">Nitrolite state channels on Base mainnet</p>
          {isConnected && isAuthenticated && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              WebSocket connected - navigate freely without losing connection
            </p>
          )}
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
                      <div className={`p-3 rounded-lg ${chain?.id === base.id ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                        <p className="text-xs text-muted-foreground mb-1">Network</p>
                        <p className="text-sm font-medium">{chain?.name || 'Unknown'}</p>
                        {chain?.id !== base.id && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Will switch to Base mainnet when connecting
                          </p>
                        )}
                      </div>
                    </div>
                    {sessionKey && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">Session Key</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetSession}
                            className="h-6 text-xs text-destructive hover:text-destructive"
                          >
                            Reset Session
                          </Button>
                        </div>
                        <p className="text-xs font-mono break-all">{sessionKey.address}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          If your session expired, reset it before connecting
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting || !sessionKey}
                      className="w-full"
                      size="lg"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {getStatusDisplay()}
                        </>
                      ) : !sessionKey ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading session...
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
                            {getStatusDisplay()}
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
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">Session Key</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetSession}
                            className="h-6 text-xs text-destructive hover:text-destructive"
                          >
                            Reset Session
                          </Button>
                        </div>
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
                  {!channel ? (
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
                        <p className="text-xs font-mono break-all">{channel.channelId}</p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Channel Balance</p>
                        <p className="text-lg font-bold">{channel.balance} units</p>
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

            {/* Close Channel - Always visible when authenticated */}
            {isAuthenticated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Close Channel
                  </CardTitle>
                  <CardDescription>Close any channel by entering its ID</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="closeChannelId">Channel ID</Label>
                    <Input
                      id="closeChannelId"
                      type="text"
                      value={closeChannelId}
                      onChange={(e) => setCloseChannelId(e.target.value)}
                      placeholder="0x..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the channel ID you want to close on-chain
                    </p>
                  </div>

                  <Button
                    onClick={handleCloseChannel}
                    disabled={isClosing || !closeChannelId.trim()}
                    variant="destructive"
                    className="w-full"
                  >
                    {isClosing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Closing Channel...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Close Channel
                      </>
                    )}
                  </Button>
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
