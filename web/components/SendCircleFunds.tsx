'use client';

import { useState } from 'react';
import { parseUnits, type Address, type Chain } from 'viem';
import { polygonAmoy, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { encodeTransfer } from '@circle-fin/modular-wallets-core';
import type { StoredAccount } from '@/lib/circle-passkey/storage';
import {
  createSmartAccountFromPasskey,
} from '@/lib/circle-passkey/account';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Send, Zap, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface SendCircleFundsProps {
  account: StoredAccount;
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

export function SendCircleFunds({ account, onClose }: SendCircleFundsProps) {
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

      // Check if credential is stored
      if (!account.credential) {
        setError('Please sign out and sign back in to update your account.');
        setIsLoading(false);
        return;
      }

      // Step 1: Use stored credential
      setLoadingStep('Preparing smart account...');
      console.log('✅ Using stored credential');

      // Step 2: Create smart account with stored credential
      const { smartAccount, bundlerClient } = await createSmartAccountFromPasskey(
        account.credential,
        selectedChain.chain
      );
      console.log('✅ Smart account created:', smartAccount.address);

      // Step 3: Encode the USDC transfer
      setLoadingStep('Preparing transaction...');
      const amountInSmallestUnit = parseUnits(amount, 6);

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
        paymaster: true,
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
      toast.success(`Sent ${amount} USDC successfully!`);

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

      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Authentication required')) {
        setError('Transaction cancelled or authentication failed. Please try again.');
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('balance')) {
        setError('Insufficient USDC balance. Get test USDC from a faucet.');
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send USDC</DialogTitle>
          <DialogDescription>
            Gasless transactions powered by Circle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chain Selector */}
          <div className="space-y-3">
            <Label>Select Network</Label>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_CHAINS.map((chainOption) => (
                <Card
                  key={chainOption.chain.id}
                  className={`cursor-pointer transition-all ${
                    selectedChain.chain.id === chainOption.chain.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => !isLoading && setSelectedChain(chainOption)}
                >
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="text-2xl mb-1">{chainOption.icon}</div>
                    <p className="text-sm font-medium">{chainOption.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isLoading}
              />
              <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2">
                USDC
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Test USDC on {selectedChain.name}
            </p>
          </div>

          {/* Gas Fee Info */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Gasless Transaction</p>
                  <p className="text-xs text-green-700">No network fees required</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading Step */}
          {isLoading && loadingStep && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-primary">{loadingStep}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success */}
          {success && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900">{success}</p>
                </div>
                {txHash && (
                  <a
                    href={`${selectedChain.chain.blockExplorers?.default.url}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 underline break-all"
                  >
                    <span>View on Explorer: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isLoading || !recipient || !amount}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send {amount || '0'} USDC
              </>
            )}
          </Button>

          {/* Transaction Details */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{selectedChain.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token</span>
                <span className="font-medium">USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas Fee</span>
                <span className="font-medium text-green-600">Free (Sponsored)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
