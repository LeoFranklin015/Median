'use client';

import { useState } from 'react';
import { encodeAbiParameters, parseUnits, type Address, type Chain } from 'viem';
import { polygonAmoy, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { encodeTransfer } from '@circle-fin/modular-wallets-core';
import type { StoredAccount } from '@/lib/circle-passkey/storage';
import { createSmartAccountFromPasskey } from '@/lib/circle-passkey/account';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Zap, ExternalLink, Check, AlertCircle, ArrowRight, X } from 'lucide-react';

interface SendTransactionProps {
  account: StoredAccount;
  open: boolean;
  onClose: () => void;
  to: string;
  value: string;
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

export function SendTransaction({ account, open, onClose, to, value }: SendTransactionProps) {
  const [selectedChainId] = useState<string>(SUPPORTED_CHAINS[0].chain.id.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const selectedChain = SUPPORTED_CHAINS.find(c => c.chain.id.toString() === selectedChainId) || SUPPORTED_CHAINS[0];

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.slice(-4)}`;
  };

  const handleSend = async () => {
    if (!to || !value) {
      setError('Missing transaction parameters');
      return;
    }

    if (!to.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid recipient address');
      return;
    }

    const amountNum = parseFloat(value);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
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

      setLoadingStep('Encoding transaction...');
      const amountInSmallestUnit = parseUnits(value, 6);
      const transferCall = encodeTransfer(
        to as Address,
        selectedChain.usdcAddress,
        amountInSmallestUnit
      );

      setLoadingStep('Sending transaction...');
      const userOpHash = await bundlerClient.sendUserOperation({
        calls: [transferCall],
        paymaster: true,
      });

      setLoadingStep('Confirming...');
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      setTxHash(receipt.receipt.transactionHash);
      setSuccess(true);
      setLoadingStep('');
      toast.success(`Sent ${value} USDC!`);

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
        setError('Insufficient USDC balance');
      } else {
        setError(errorMessage);
      }

      toast.error('Transaction failed');
      setLoadingStep('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[380px] p-0 gap-0">
        <DialogTitle className="sr-only">Send Transaction</DialogTitle>

        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-3 top-3 rounded-sm opacity-70 hover:opacity-100 disabled:pointer-events-none z-10"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="p-3 space-y-1.5">
          {/* From/To */}
          <Card className="bg-muted border-muted">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">From</p>
                  <p className="text-xs font-semibold truncate">{`${account.smartAccountAddress.substring(0, 6)}...${account.smartAccountAddress.slice(-4)}`}</p>
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">To</p>
                  <p className="text-xs font-semibold font-mono truncate">
                    {to ? `${to.substring(0, 6)}...${to.slice(-4)}` : ''}
                  </p>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network */}
          <Card className="bg-muted border-muted">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Network</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{selectedChain.icon}</span>
                  <span className="text-[11px] font-medium">{selectedChain.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interacting with */}
          <Card className="bg-muted border-muted">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Interacting with</p>
                <p className="text-[10px] font-mono">{formatAddress(selectedChain.usdcAddress)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Amount */}
          <Card className="bg-muted border-muted">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">Amount</p>
                <p className="text-[11px] font-semibold">{value} USDC</p>
              </div>
            </CardContent>
          </Card>

          {/* Network Fee */}
          <Card className="bg-muted border-muted">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-muted-foreground">Network fee</p>
                  <Zap className="w-3 h-3 text-blue-500" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold">0 E ETH</p>
                  <p className="text-[9px] text-muted-foreground">{'< $0.01'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {isLoading && loadingStep && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <p className="text-[10px] text-primary font-medium">{loadingStep}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <p className="text-[10px] text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success */}
          {success && txHash && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <p className="text-[10px] font-medium text-green-900">Transaction successful!</p>
                </div>
                <a
                  href={`${selectedChain.chain.blockExplorers?.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-green-700 hover:text-green-900 underline"
                >
                  View on Explorer
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1.5">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-10 text-xs font-medium rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading}
              className="flex-1 h-10 text-xs font-medium rounded-full bg-gray-600 hover:bg-gray-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
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
