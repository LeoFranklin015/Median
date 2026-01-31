'use client';

import { useState } from 'react';
import { parseUnits, type Address, type Chain } from 'viem';
import { polygonAmoy, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { encodeTransfer } from '@circle-fin/modular-wallets-core';
import {
  reauthenticateForTransaction,
  createSmartAccountFromPasskey,
} from '@/lib/passkey-utils';

interface SendFundsProps {
  username: string;
  onClose: () => void;
}

interface SupportedChain {
  chain: Chain;
  name: string;
  icon: string;
  usdcAddress: Address;
}

const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    icon: '🟣',
    usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  },
  {
    chain: sepolia,
    name: 'Ethereum Sepolia',
    icon: '⬨',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  {
    chain: baseSepolia,
    name: 'Base Sepolia',
    icon: '🔵',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  {
    chain: arbitrumSepolia,
    name: 'Arbitrum Sepolia',
    icon: '🔷',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
];

export function SendFunds({ username, onClose }: SendFundsProps) {
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(SUPPORTED_CHAINS[0]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const handleSend = async () => {
    if (!recipient || !amount) {
      setError('Please enter recipient address and amount');
      return;
    }

    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);

      console.log('💸 Starting transaction...');
      console.log('Chain:', selectedChain.name);
      console.log('Recipient:', recipient);
      console.log('Amount:', amount, 'USDC');

      // Step 1: Re-authenticate to get fresh credential
      setLoadingStep('Authenticating with passkey...');
      const credential = await reauthenticateForTransaction(username);
      console.log('✅ Authentication successful');

      // Step 2: Create smart account with the credential
      setLoadingStep('Creating smart account...');
      const { smartAccount, bundlerClient } = await createSmartAccountFromPasskey(
        credential,
        selectedChain.chain
      );
      console.log('✅ Smart account created:', smartAccount.address);

      // Step 3: Encode the USDC transfer
      setLoadingStep('Preparing transaction...');
      const amountInSmallestUnit = parseUnits(amount, 6); // USDC has 6 decimals

      const transferCall = encodeTransfer(
        recipient as Address,
        selectedChain.usdcAddress,
        amountInSmallestUnit
      );
      console.log('✅ Transfer encoded');

      // Step 4: Send the user operation with paymaster (gasless)
      setLoadingStep('Sending transaction (gasless)...');
      const userOpHash = await bundlerClient.sendUserOperation({
        calls: [transferCall],
        paymaster: true, // Enable gas sponsorship
      });
      console.log('✅ User operation sent:', userOpHash);

      // Step 5: Wait for receipt
      setLoadingStep('Waiting for confirmation...');
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      console.log('✅ Transaction confirmed:', receipt);

      // Success!
      setTxHash(receipt.receipt.transactionHash);
      setSuccess(`Successfully sent ${amount} USDC!`);
      setLoadingStep('');

      // Clear form after success
      setTimeout(() => {
        setRecipient('');
        setAmount('');
      }, 2000);

    } catch (err) {
      console.error('❌ Transaction error:', err);

      let errorMessage = 'Transaction failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Add helpful context
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Authentication required')) {
        setError('Transaction cancelled or authentication failed. Please try again.');
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('balance')) {
        setError('Insufficient USDC balance. Get test USDC from a faucet.');
      } else {
        setError(errorMessage);
      }

      setLoadingStep('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Send USDC</h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Gasless transactions powered by Circle</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Chain Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Network
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_CHAINS.map((chainOption) => (
                <button
                  key={chainOption.chain.id}
                  onClick={() => setSelectedChain(chainOption)}
                  disabled={isLoading}
                  className={`p-4 border-2 rounded-xl transition-all disabled:opacity-50 ${
                    selectedChain.chain.id === chainOption.chain.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{chainOption.icon}</div>
                  <p className="text-sm font-medium text-gray-900">{chainOption.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                USDC
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Test USDC on {selectedChain.name}
            </p>
          </div>

          {/* Gas Fee Info */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <p className="text-sm font-medium text-green-900">Gasless Transaction</p>
                <p className="text-xs text-green-700">No network fees required</p>
              </div>
            </div>
          </div>

          {/* Loading Step */}
          {isLoading && loadingStep && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-blue-900">{loadingStep}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">{success}</p>
              {txHash && (
                <a
                  href={`${selectedChain.chain.blockExplorers?.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 hover:text-green-900 underline break-all"
                >
                  View on Explorer: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)} →
                </a>
              )}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || !recipient || !amount}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>💸</span>
                <span>Send {amount || '0'} USDC</span>
              </>
            )}
          </button>

          {/* Transaction Details */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Network</span>
              <span className="font-medium text-gray-900">{selectedChain.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Token</span>
              <span className="font-medium text-gray-900">USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gas Fee</span>
              <span className="font-medium text-green-600">Free (Sponsored)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
