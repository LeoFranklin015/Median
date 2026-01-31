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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Check, Send, Download, ArrowRight, Sparkles, Lock, Shield, Wallet } from 'lucide-react';

export function ConnectWallet() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<StoredAccount | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSendFunds, setShowSendFunds] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
      toast.success('Account created successfully!');
      setShowAuthModal(false);
    } catch (err) {
      console.error('❌ Sign up error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';

      if (errorMessage.includes('NotAllowedError')) {
        setError('Passkey creation was cancelled');
      } else if (errorMessage.includes('NotSupportedError')) {
        setError('Passkeys not supported on this browser');
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
      toast.success('Signed in successfully!');
      setShowAuthModal(false);
    } catch (err) {
      console.error('❌ Sign in error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
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
      toast.success(`Welcome back, @${account.username}!`);
      setShowAuthModal(false);
    } catch (err) {
      console.error('❌ Quick sign in error:', err);
      setError('Failed to sign in');
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
    toast.info('Signed out successfully');
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

  // Connected state
  if (user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={`w-12 h-12 ${getAvatarColor(user.username)}`}>
              <AvatarFallback className="text-white font-bold">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">Welcome back!</h2>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

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
          <CardContent>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {user.smartAccountAddress}
              </p>
            </div>
          </CardContent>
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
            <CardTitle className="text-base">Account Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>No gas fees on transactions</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Biometric authentication</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Multi-chain support</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not connected - show connect button
  return (
    <>
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Use your device biometrics to create or access your smart wallet
          </p>
        </div>

        <Button size="lg" onClick={() => setShowAuthModal(true)} className="gap-2">
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </Button>

        <Card className="border-primary/20 bg-primary/5 max-w-md">
          <CardContent className="pt-6">
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>No passwords needed</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Biometric security</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Gasless transactions</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</DialogTitle>
            <DialogDescription>
              {mode === 'signin' ? 'Sign in with your passkey' : 'Sign up using your device biometrics'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => {
            setMode(v as 'signin' | 'signup');
            setShowManualInput(v === 'signup');
            setError(null);
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              {savedAccounts.length > 0 && !showManualInput ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Your Accounts ({savedAccounts.length})</p>
                    <Button variant="link" size="sm" onClick={() => setShowManualInput(true)} className="h-auto p-0">
                      Use different account
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {savedAccounts.map((account) => (
                      <Card key={account.username} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleQuickSignIn(account)}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <Avatar className={`w-12 h-12 ${getAvatarColor(account.username)}`}>
                            <AvatarFallback className="text-white font-bold">
                              {getInitials(account.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">@{account.username}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {account.smartAccountAddress.substring(0, 10)}...{account.smartAccountAddress.slice(-8)}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-primary py-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Signing in...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAccounts.length === 0 && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          No saved accounts yet. Sign up to create your first account!
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {savedAccounts.length > 0 && (
                    <Button variant="link" size="sm" onClick={() => setShowManualInput(false)} className="h-auto p-0">
                      ← Back to saved accounts
                    </Button>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <Input
                      id="signin-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <Card className="border-destructive bg-destructive/10">
                      <CardContent className="pt-6">
                        <p className="text-sm text-destructive">{error}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Button onClick={handleSignIn} disabled={isLoading || !username.trim()} className="w-full" size="lg">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Sign In with Passkey
                      </>
                    )}
                  </Button>

                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex gap-2">
                        <Shield className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium mb-1">Secure Sign In</p>
                          <p className="text-xs text-muted-foreground">
                            Use your device biometrics to securely sign in.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="pt-6">
                    <p className="text-sm text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}

              <Button onClick={handleSignUp} disabled={isLoading || !username.trim()} className="w-full" size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Account with Passkey
                  </>
                )}
              </Button>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Sparkles className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">Quick Setup</p>
                      <p className="text-xs text-muted-foreground">
                        Your account will be secured with your device biometrics. No passwords needed!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
