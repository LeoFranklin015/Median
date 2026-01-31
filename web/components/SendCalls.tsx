'use client';

import { useState } from 'react';
import { encodeFunctionData, type Address, type Chain, type Abi } from 'viem';
import { polygonAmoy, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import type { StoredAccount } from '@/lib/circle-passkey/storage';
import { createSmartAccountFromPasskey } from '@/lib/circle-passkey/account';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Zap, ExternalLink, Check, AlertCircle, ArrowRight, X, Layers } from 'lucide-react';

interface TransactionCall {
  contractAddress: Address;
  value: string | bigint;
  abi?: Abi;
  functionName?: string;
  parameters?: any[];
}

interface SendCallsProps {
  account: StoredAccount;
  open: boolean;
  onClose: () => void;
  calls: TransactionCall[];
  chain?: Chain; // Optional: defaults to Polygon Amoy
}

interface SupportedChain {
  chain: Chain;
  name: string;
  icon: string;
}

const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    chain: baseSepolia,
    name: 'Base Sepolia',
    icon: '🔵',
  },
  {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    icon: '🟣',
  },
  {
    chain: sepolia,
    name: 'Ethereum Sepolia',
    icon: '⬨',
  },
  {
    chain: arbitrumSepolia,
    name: 'Arbitrum Sepolia',
    icon: '🔷',
  },
];

export function SendCalls({ account, open, onClose, calls, chain }: SendCallsProps) {
  const [selectedChainId, setSelectedChainId] = useState<string>(
    chain ? chain.id.toString() : SUPPORTED_CHAINS[0].chain.id.toString()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const selectedChain = SUPPORTED_CHAINS.find(c => c.chain.id.toString() === selectedChainId) || SUPPORTED_CHAINS[0];
  const isBatch = calls.length > 1;

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.slice(-4)}`;
  };

  const encodeCall = (call: TransactionCall) => {
    const valueAmount = typeof call.value === 'string' ? BigInt(call.value) : call.value;

    // If abi and functionName are provided, encode contract call
    if (call.abi && call.functionName) {
      const data = encodeFunctionData({
        abi: call.abi,
        functionName: call.functionName,
        args: call.parameters || [],
      });

      return {
        to: call.contractAddress,
        value: valueAmount,
        data,
      };
    }

    // Otherwise, it's a simple native transfer (ETH/MATIC/etc)
    return {
      to: call.contractAddress,
      value: valueAmount,
    };
  };

  const handleSend = async () => {
    if (!calls || calls.length === 0) {
      setError('No calls provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      setTxHash(null);

      if (!account.credential) {
        setError('Please reconnect your account');
        setIsLoading(false);
        return;
      }

      setLoadingStep('Preparing account...');
      const { bundlerClient } = await createSmartAccountFromPasskey(
        account.credential,
        selectedChain.chain
      );

      setLoadingStep(isBatch ? 'Encoding batch transaction...' : 'Encoding transaction...');
      const encodedCalls = calls.map(encodeCall);

      setLoadingStep('Sending transaction...');
      const userOpHash = await bundlerClient.sendUserOperation({
        calls: encodedCalls,
        paymaster: true,
      });

      setLoadingStep('Confirming...');
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      setTxHash(receipt.receipt.transactionHash);
      setSuccess(true);
      setLoadingStep('');
      toast.success(isBatch ? `Batch transaction successful!` : `Transaction successful!`);

      setTimeout(() => {
        setSuccess(false);
        setTxHash(null);
      }, 3000);

    } catch (err) {
      console.error('❌ Transaction error:', err);
      let errorMessage = 'Transaction failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      if (errorMessage.includes('NotAllowedError')) {
        setError('Transaction cancelled');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient balance');
      } else {
        setError(errorMessage);
      }

      toast.error('Transaction failed');
      setLoadingStep('');
    } finally {
      setIsLoading(false);
    }
  };

  // Get display info for single call
  const getSingleCallInfo = () => {
    if (calls.length !== 1) return null;
    const call = calls[0];

    return {
      to: call.contractAddress,
      isContractCall: !!(call.abi && call.functionName),
      functionName: call.functionName || 'transfer',
      value: call.value,
    };
  };

  const singleCall = getSingleCallInfo();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] p-0 gap-0 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <DialogTitle className="sr-only">
          {isBatch ? 'Batch Transaction' : 'Send Transaction'}
        </DialogTitle>

        <div className="p-6 space-y-5">
          {/* Header: Network & Fee */}
          

          {/* From/To Info */}
          {!isBatch && singleCall && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">From</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100 truncate">
                    {account.username || 'Account 1'}
                  </p>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
                    {`${account.smartAccountAddress.substring(0,4)}...${account.smartAccountAddress.slice(-4)}`}
                  </p>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-600 shrink-0" />

                <div className="flex-1 min-w-0 space-y-1 text-right">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">To</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100 truncate">
                    {formatAddress(singleCall.to)}
                  </p>
                </div>
              </div>
            </div>
          )}

<div className="flex items-start justify-between gap-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            {/* Left: Network */}
            <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Network</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="network icon">
                  {selectedChain.icon}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedChain.name}
                </h3>
              </div>

            </div>

            {/* Right: Network Fee */}
            <div className="text-right space-y-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Network Fee</p>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Sponsored
                </p>
              </div>
            </div>
          </div>

          {/* Batch Info */}
          {isBatch && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Batch Transaction</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{calls.length} calls</p>
                </div>
              </div>
            </div>
          )}

          {/* Call Details Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {isBatch ? 'Calls' : 'Data'}
              </h4>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isBatch ? (
                calls.map((call, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {idx + 1}.
                      </span>
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                        {call.functionName || 'transfer'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {formatAddress(call.contractAddress)}
                    </span>
                  </div>
                ))
              ) : singleCall ? (
                <>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Function</span>
                    <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                      {singleCall.functionName}
                    </span>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">To</span>
                    <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                      {formatAddress(singleCall.to)}
                    </span>
                  </div>

                  {singleCall.value && BigInt(singleCall.value) > 0 && (
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Value</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {singleCall.value.toString()}
                      </span>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Loading */}
          {isLoading && loadingStep && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl px-4 py-3 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">{loadingStep}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 border border-red-200/50 dark:border-red-800/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {success && txHash && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3 border border-emerald-200/50 dark:border-emerald-800/50">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Transaction successful!</p>
                </div>
                <a
                  href={`${selectedChain.chain.blockExplorers?.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 underline underline-offset-2"
                >
                  View on Explorer
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-medium rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-medium rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
