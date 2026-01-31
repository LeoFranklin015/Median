'use client';

import { useState, useEffect } from 'react';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isEthereumWallet } from '@dynamic-labs/ethereum';
import { createPublicClient } from 'viem';
import { polygonAmoy } from 'viem/chains';
import {
  toModularTransport,
  toCircleSmartAccount,
  walletClientToLocalAccount
} from '@circle-fin/modular-wallets-core';
import { SendFundsWallet } from './SendFundsWallet';

export function ConnectWallet() {
  const { primaryWallet, user } = useDynamicContext();
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendFunds, setShowSendFunds] = useState(false);

  useEffect(() => {
    async function setupSmartAccount() {
      if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
        setSmartAccountAddress(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get the wallet client from Dynamic
        const walletClient = await primaryWallet.getWalletClient();

        // Create viem public client with Circle's modular transport
        // Note: The URL includes the chain name (polygonAmoy)
        const client = createPublicClient({
          chain: polygonAmoy,
          transport: toModularTransport(
            `${process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL}/polygonAmoy`,
            process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY!
          ),
        });

        // Convert wallet client to local account for Circle
        const localAccount = walletClientToLocalAccount(walletClient);

        // Create Circle Smart Account
        const smartAccount = await toCircleSmartAccount({
          client,
          owner: localAccount,
        });

        setSmartAccountAddress(smartAccount.address);
      } catch (err) {
        console.error('Error setting up smart account:', err);
        setError(err instanceof Error ? err.message : 'Failed to setup smart account');
      } finally {
        setIsLoading(false);
      }
    }

    setupSmartAccount();
  }, [primaryWallet]);

  // If smart account is ready, show dashboard
  if (smartAccountAddress && primaryWallet) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
            <p className="text-sm text-gray-600 mt-1">{user?.email || 'Connected'}</p>
          </div>
          <DynamicWidget />
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
              {smartAccountAddress}
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
              navigator.clipboard.writeText(smartAccountAddress);
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
          <SendFundsWallet
            primaryWallet={primaryWallet}
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
              <span>Multi-chain support</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              <span>Secure wallet connection</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Connection UI
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600">
          Connect your wallet to create a Circle Smart Account
        </p>
      </div>

      <div className="flex justify-center">
        <DynamicWidget />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Setting up Smart Account...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {primaryWallet && !smartAccountAddress && !isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">Wallet connected. Initializing smart account...</p>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm text-blue-900 font-medium mb-2">
          ✨ Gasless Transactions
        </p>
        <p className="text-xs text-blue-700">
          Your Circle Smart Account will support gasless transactions on multiple chains!
        </p>
      </div>
    </div>
  );
}
