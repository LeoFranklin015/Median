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
  getSmartAccountAddress,
} from '@/lib/circle-passkey/account';
import { SendCircleFunds } from './SendCircleFunds';

export function CircleAuth() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<StoredAccount | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSendFunds, setShowSendFunds] = useState(false);

  // Load saved accounts and current user on mount
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

      console.log('🔐 Starting registration...');

      // Register passkey
      const credential = await registerWithPasskey(username);

      console.log('✅ Passkey created, getting smart account address...');

      // Get smart account address
      const smartAccountAddress = await getSmartAccountAddress(credential);

      console.log('✅ Smart account address:', smartAccountAddress);

      const storedAccount: StoredAccount = {
        username,
        smartAccountAddress,
        credentialId: credential.id,
        credential: credential, // Store the full credential for reuse
        lastUsed: Date.now(),
      };

      saveAccount(storedAccount);
      setCurrentUser(storedAccount);
      setUser(storedAccount);
      setSavedAccounts(getSavedAccounts());
    } catch (err) {
      console.error('❌ Sign up error:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to sign up. Check console for details.';

      if (errorMessage.includes('NotAllowedError')) {
        setError('Passkey creation was cancelled or not allowed. Please try again.');
      } else if (errorMessage.includes('NotSupportedError')) {
        setError('Your browser or device does not support passkeys. Try Chrome, Safari, or Edge.');
      } else {
        setError(errorMessage);
      }
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

      // Check if we have a saved account for this user
      const existingAccount = savedAccounts.find(a => a.username === username);
      if (existingAccount) {
        setUser(existingAccount);
        setCurrentUser(existingAccount);
        setIsLoading(false);
        return;
      }

      setError('No account found for this username. Please sign up first.');
    } catch (err) {
      console.error('❌ Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSignIn = async (account: StoredAccount) => {
    setUser(account);
    setCurrentUser(account);
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentUser(null);
    setUsername('');
    setShowManualInput(false);
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // If user is authenticated, show dashboard
  if (user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
            <p className="text-sm text-gray-600 mt-1">@{user.username}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Smart Account Active</p>
              <p className="text-xs text-gray-500">Gasless transactions enabled</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg">
            <p className="text-xs font-mono text-gray-500 break-all">
              {user.smartAccountAddress}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowSendFunds(true)}
            className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="text-2xl mb-2">💸</div>
            <p className="font-medium text-gray-900">Send</p>
            <p className="text-xs text-gray-500 mt-1">Transfer funds</p>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(user.smartAccountAddress);
              alert('Address copied to clipboard!');
            }}
            className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="text-2xl mb-2">📥</div>
            <p className="font-medium text-gray-900">Receive</p>
            <p className="text-xs text-gray-500 mt-1">Copy address</p>
          </button>
        </div>

        {/* Send Funds Modal */}
        {showSendFunds && (
          <SendCircleFunds
            account={user}
            onClose={() => setShowSendFunds(false)}
          />
        )}

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Account Features</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              <span>No gas fees on transactions</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              <span>Biometric authentication</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              <span>Multi-chain support</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Authentication UI
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-600">
          {mode === 'signin'
            ? 'Sign in with your passkey'
            : 'Sign up using your device biometrics'}
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => {
            setMode('signin');
            setShowManualInput(false);
            setError(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            mode === 'signin'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => {
            setMode('signup');
            setShowManualInput(true);
            setError(null);
          }}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            mode === 'signup'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign Up
        </button>
      </div>

      {mode === 'signin' && savedAccounts.length > 0 && !showManualInput ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Your Accounts ({savedAccounts.length})</p>
            <button
              onClick={() => setShowManualInput(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Use different account
            </button>
          </div>

          <div className="space-y-3">
            {savedAccounts.map((account) => (
              <button
                key={account.username}
                onClick={() => handleQuickSignIn(account)}
                disabled={isLoading}
                className="w-full p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`w-12 h-12 ${getAvatarColor(account.username)} rounded-full flex items-center justify-center text-white font-bold`}>
                  {getInitials(account.username)}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">@{account.username}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {account.smartAccountAddress.substring(0, 10)}...{account.smartAccountAddress.substring(account.smartAccountAddress.length - 8)}
                  </p>
                </div>
                <div className="text-gray-400">
                  →
                </div>
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-blue-600 py-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Signing in...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {mode === 'signin' && savedAccounts.length === 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-sm text-gray-600">
                No saved accounts yet. Sign up to create your first account!
              </p>
            </div>
          )}

          {mode === 'signin' && savedAccounts.length > 0 && (
            <button
              onClick={() => setShowManualInput(false)}
              className="text-sm text-blue-600 hover:text-blue-700 mb-2"
            >
              ← Back to saved accounts
            </button>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={mode === 'signin' ? handleSignIn : handleSignUp}
            disabled={isLoading || !username.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{mode === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span className="text-xl">
                  {mode === 'signin' ? '🔐' : '✨'}
                </span>
                <span>
                  {mode === 'signin' ? 'Sign In with Passkey' : 'Create Account with Passkey'}
                </span>
              </>
            )}
          </button>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              {mode === 'signin' ? '🔒 Secure Sign In' : '✨ Quick Setup'}
            </p>
            <p className="text-xs text-blue-700">
              {mode === 'signin'
                ? 'Use your device biometrics (Face ID, Touch ID, or Windows Hello) to securely sign in.'
                : 'Your account will be secured with your device biometrics. No passwords needed!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
