'use client';

import { useState } from 'react';
import { type Address, type Chain, type TypedData, hashTypedData } from 'viem';
import { polygonAmoy, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import type { StoredAccount } from '@/lib/circle-passkey/storage';
import { createSmartAccountFromPasskey } from '@/lib/circle-passkey/account';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Loader2, ExternalLink, Check, AlertCircle, FileSignature, Shield } from 'lucide-react';

interface EIP712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: Address;
  salt?: string;
}

interface SignTypedDataProps {
  account: StoredAccount;
  open: boolean;
  onClose: () => void;
  domain: EIP712Domain;
  types: Record<string, any>;
  primaryType: string;
  message: Record<string, any>;
  chain?: Chain;
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

export function SignTypedData({
  account,
  open,
  onClose,
  domain,
  types,
  primaryType,
  message,
  chain,
}: SignTypedDataProps) {
  const [selectedChainId, setSelectedChainId] = useState<string>(
    chain ? chain.id.toString() : SUPPORTED_CHAINS[0].chain.id.toString()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const selectedChain = SUPPORTED_CHAINS.find(c => c.chain.id.toString() === selectedChainId) || SUPPORTED_CHAINS[0];

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'string' && value.startsWith('0x')) {
      // Format addresses
      if (value.length === 42) return formatAddress(value);
      // Truncate long hex strings
      if (value.length > 20) return `${value.substring(0, 10)}...${value.slice(-8)}`;
    }
    return String(value);
  };

  // Get field type from the types definition
  const getFieldType = (fieldName: string): string => {
    if (!types[primaryType]) return 'unknown';
    const field = types[primaryType].find((f: any) => f.name === fieldName);
    return field?.type || 'unknown';
  };

  const handleSign = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      setSignature(null);

      if (!account.credential) {
        setError('Please reconnect your account');
        setIsLoading(false);
        return;
      }

      setLoadingStep('Preparing account...');
      const { smartAccount } = await createSmartAccountFromPasskey(
        account.credential,
        selectedChain.chain
      );

      setLoadingStep('Signing message...');

      // Sign the typed data
      const sig = await smartAccount.signTypedData({
        domain: domain as any,
        types,
        primaryType,
        message,
      });

      setSignature(sig);
      setSuccess(true);
      setLoadingStep('');
      toast.success('Message signed successfully!');

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err) {
      console.error('❌ Signing error:', err);
      let errorMessage = 'Signing failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      if (errorMessage.includes('NotAllowedError')) {
        setError('Signing cancelled');
      } else {
        setError(errorMessage);
      }

      toast.error('Signing failed');
      setLoadingStep('');
    } finally {
      setIsLoading(false);
    }
  };

  const copySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(signature);
      toast.success('Signature copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] max-h-[90vh] p-0 gap-0 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col">
        <DialogTitle className="sr-only">Sign Message</DialogTitle>

        {/* Fixed Header */}
        <div className="p-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
          <div className="flex items-start justify-between gap-6">
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

            {/* Right: Signature Type */}
            <div className="text-right space-y-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">EIP-712</p>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                  Typed Data
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Signing Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <FileSignature className="w-5 h-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {domain.name || 'Signature Request'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {account.username || 'Account 1'}
                </p>
              </div>
            </div>
          </div>

          {/* Combined Data Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <Accordion type="multiple" className="w-full">
              {/* Domain Section */}
              <AccordionItem value="domain" className="border-0">
                <AccordionTrigger className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:no-underline hover:bg-slate-100 dark:hover:bg-slate-800">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Domain
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {domain.name && (
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Name</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                          {domain.name}
                        </span>
                      </div>
                    )}
                    {domain.version && (
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Version</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                          {domain.version}
                        </span>
                      </div>
                    )}
                    {domain.chainId && (
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chain ID</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                          {domain.chainId}
                        </span>
                      </div>
                    )}
                    {domain.verifyingContract && (
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Contract</span>
                        <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                          {formatAddress(domain.verifyingContract)}
                        </span>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Message Section */}
              <AccordionItem value="message" className="border-0 border-t border-slate-100 dark:border-slate-800/50">
                <AccordionTrigger className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:no-underline hover:bg-slate-100 dark:hover:bg-slate-800">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Message ({primaryType})
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {Object.entries(message).map(([key, value], idx) => {
                      const fieldType = getFieldType(key);
                      const isComplexType = typeof value === 'object' && value !== null;

                      return (
                        <div key={idx} className="px-4 py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {key}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  ({fieldType})
                                </span>
                              </div>
                              <div className="py-1.5 px-2 bg-slate-50 dark:bg-slate-800/50 rounded text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                                {isComplexType
                                  ? JSON.stringify(value, null, 2)
                                  : formatValue(value)
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-3 border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Only sign if you trust this site
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your signature can be used to perform actions on your behalf
                </p>
              </div>
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
          {success && signature && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3 border border-emerald-200/50 dark:border-emerald-800/50">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    Message signed successfully!
                  </p>
                </div>
                <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <p className="text-xs font-mono text-emerald-800 dark:text-emerald-200 break-all">
                    {signature}
                  </p>
                </div>
                <button
                  onClick={copySignature}
                  className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 underline underline-offset-2"
                >
                  Copy Signature
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer with Buttons */}
        <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-medium rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={isLoading}
              className="flex-1 h-11 text-sm font-medium rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing...
                </>
              ) : (
                'Sign'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
