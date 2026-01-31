'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2, ArrowRight, Sparkles, Lock, Shield, Wallet, LogOut, Plus, Copy, ChevronDown } from 'lucide-react';

export function ConnectWallet() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  // Read user from localStorage directly
  const user = getCurrentUser();
  const savedAccounts = getSavedAccounts();

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
      toast.success('Account created!');
      setShowAuthModal(false);
      setShowCreateAccount(false);
      setUsername('');
      // Force re-render by closing and reopening won't be needed since parent will re-render
      window.location.reload();
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
      toast.success('Signed in!');
      setShowAuthModal(false);
      setUsername('');
      window.location.reload();
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
      toast.success(`Welcome back!`);
      setShowAuthModal(false);
      window.location.reload();
    } catch (err) {
      console.error('❌ Quick sign in error:', err);
      toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setUsername('');
    setShowManualInput(false);
    toast.info('Signed out');
    window.location.reload();
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

  // Connected state - compact dropdown button
  if (user) {
    return (
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
    );
  }

  // Not connected - show connect button
  return (
    <>
      <Button size="lg" onClick={() => setShowAuthModal(true)} className="gap-2">
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </Button>

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
