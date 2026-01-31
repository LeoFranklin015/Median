'use client';

import { useState, useEffect } from 'react';
import {
  getSavedAccounts,
  getCurrentUser,
  setCurrentUser,
  saveAccount,
  type StoredAccount
} from '@/lib/circle-passkey/storage';
import {
  registerWithPasskey,
  loginWithPasskey,
  getSmartAccountAddress,
} from '@/lib/circle-passkey/account';
import { SendCircleFunds } from './SendCircleFunds';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Check, Send, Download, ArrowRight, Sparkles, Lock, Shield, Wallet, LogOut, Plus, Copy, ChevronDown } from 'lucide-react';

export function ConnectWallet() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<StoredAccount | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSendFunds, setShowSendFunds] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  useEffect(() => {
    const accounts = getSavedAccounts();
    setSavedAccounts(accounts);

    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleSignUp = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const credential = await registerWithPasskey(username);
      const smartAccountAddress = await getSmartAccountAddress(credential);

      const storedAccount: StoredAccount = {
        username,
        smartAccountAddress,
        credentialId: credential.id,
        credential: credential,
        lastUsed: Date.now(),
      };

      saveAccount(storedAccount);
      setCurrentUser(storedAccount);
      setUser(storedAccount);
      setSavedAccounts(getSavedAccounts());
      toast.success('Account created!');
      setShowAuthModal(false);
      setShowCreateAccount(false);
      setUsername('');
    } catch (err) {
      console.error('❌ Sign up error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';

      if (errorMessage.includes('NotAllowedError')) {
        setError('Passkey creation was cancelled');
      } else if (errorMessage.includes('NotSupportedError')) {
        setError('Passkeys not supported');
      } else {
        setError(errorMessage);
      }
      toast.error('Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const existingAccount = savedAccounts.find(a => a.username === username);
      const credential = await loginWithPasskey(
        username,
        existingAccount?.credentialId,
        existingAccount?.credential
      );

      let smartAccountAddress: string;
      if (existingAccount) {
        smartAccountAddress = existingAccount.smartAccountAddress;
      } else {
        smartAccountAddress = await getSmartAccountAddress(credential);
      }

      const storedAccount: StoredAccount = {
        username,
        smartAccountAddress,
        credentialId: credential.id,
        credential: credential,
        lastUsed: Date.now(),
      };

      saveAccount(storedAccount);
      setCurrentUser(storedAccount);
      setUser(storedAccount);
      setSavedAccounts(getSavedAccounts());
      toast.success('Signed in!');
      setShowAuthModal(false);
      setUsername('');
    } catch (err) {
      console.error('❌ Sign in error:', err);
      setError('Failed to sign in');
      toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSignIn = async (account: StoredAccount) => {
    try {
      setIsLoading(true);
      setError(null);

      const credential = await loginWithPasskey(
        account.username,
        account.credentialId,
        account.credential
      );

      const updatedAccount: StoredAccount = {
        ...account,
        credential: credential,
        lastUsed: Date.now(),
      };

      saveAccount(updatedAccount);
      setCurrentUser(updatedAccount);
      setUser(updatedAccount);
      setSavedAccounts(getSavedAccounts());
      toast.success(`Welcome back!`);
      setShowAuthModal(false);
    } catch (err) {
      console.error('❌ Quick sign in error:', err);
      toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentUser(null);
    setUsername('');
    setShowManualInput(false);
    toast.info('Signed out');
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const copyAddress = () => {
    if (user) {
      navigator.clipboard.writeText(user.smartAccountAddress);
      toast.success('Address copied!');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.slice(-4)}`;
  };

  // Connected state - compact wallet button
  if (user) {
    return (
      <div className="flex flex-col gap-6">
        {/* Compact wallet button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Wallet</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Avatar className={`w-5 h-5 ${getAvatarColor(user.username)}`}>
                  <AvatarFallback className="text-white text-xs font-bold">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono text-sm">{formatAddress(user.smartAccountAddress)}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">@{user.username}</p>
                <p className="text-xs text-muted-foreground font-mono">{formatAddress(user.smartAccountAddress)}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyAddress}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Address
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dashboard */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Smart Account Active</CardTitle>
                <CardDescription>Gasless transactions enabled</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setShowSendFunds(true)}>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Send className="w-8 h-8 mb-2 text-primary" />
              <h3 className="font-semibold">Send</h3>
              <p className="text-xs text-muted-foreground mt-1">Transfer funds</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={copyAddress}>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Download className="w-8 h-8 mb-2 text-primary" />
              <h3 className="font-semibold">Receive</h3>
              <p className="text-xs text-muted-foreground mt-1">Copy address</p>
            </CardContent>
          </Card>
        </div>

        {showSendFunds && <SendCircleFunds account={user} onClose={() => setShowSendFunds(false)} />}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-xs">
                <Check className="w-3 h-3 text-green-500" />
                <span>No gas fees on transactions</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <Check className="w-3 h-3 text-green-500" />
                <span>Biometric authentication</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <Check className="w-3 h-3 text-green-500" />
                <span>Multi-chain support</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not connected
  return (
    <>
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-muted-foreground">
            Use biometrics to access your smart wallet
          </p>
        </div>

        <Button size="lg" onClick={() => setShowAuthModal(true)} className="gap-2">
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </Button>
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={(open) => {
        setShowAuthModal(open);
        if (!open) {
          setShowCreateAccount(false);
          setShowManualInput(false);
          setError(null);
          setUsername('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{showCreateAccount ? 'Create Account' : 'Sign In'}</DialogTitle>
            <DialogDescription>
              {showCreateAccount ? 'Create a new account with biometrics' : 'Choose an account or sign in'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!showCreateAccount ? (
              <>
                {/* Account list */}
                {savedAccounts.length > 0 && !showManualInput ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Your Accounts</p>
                    <div className="space-y-2">
                      {savedAccounts.map((account) => (
                        <Card
                          key={account.username}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => handleQuickSignIn(account)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Avatar className={`w-8 h-8 ${getAvatarColor(account.username)}`}>
                              <AvatarFallback className="text-white text-xs font-bold">
                                {getInitials(account.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">@{account.username}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {formatAddress(account.smartAccountAddress)}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {isLoading && (
                      <div className="flex items-center justify-center gap-2 text-primary py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Signing in...</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManualInput(true)}
                      className="w-full"
                    >
                      Use different account
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Manual sign in */}
                    {savedAccounts.length > 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowManualInput(false)}
                        className="h-auto p-0 text-xs"
                      >
                        ← Back to accounts
                      </Button>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signin-username" className="text-xs">Username</Label>
                      <Input
                        id="signin-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        disabled={isLoading}
                        className="h-9"
                      />
                    </div>

                    {error && (
                      <Card className="border-destructive bg-destructive/10">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-xs text-destructive">{error}</p>
                        </CardContent>
                      </Card>
                    )}

                    <Button onClick={handleSignIn} disabled={isLoading || !username.trim()} className="w-full" size="sm">
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Create account button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateAccount(true)}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Account
                </Button>
              </>
            ) : (
              <>
                {/* Create account form */}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setShowCreateAccount(false);
                    setError(null);
                    setUsername('');
                  }}
                  className="h-auto p-0 text-xs"
                >
                  ← Back
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-xs">Choose Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>

                {error && (
                  <Card className="border-destructive bg-destructive/10">
                    <CardContent className="pt-4 pb-3">
                      <p className="text-xs text-destructive">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={handleSignUp} disabled={isLoading || !username.trim()} className="w-full" size="sm">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex gap-2">
                      <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Secured with your device biometrics. No passwords needed!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
