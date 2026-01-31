'use client';

import { useState } from 'react';
import { ConnectWallet } from "@/components/ConnectWallet";
import { SendCalls } from "@/components/SendCalls";
import { SignTypedData } from "@/components/SignTypedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/circle-passkey/storage";
import { Check, Send, Download, Copy, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { parseUnits, type Address } from 'viem';
import { polygonAmoy, baseSepolia } from 'viem/chains';

export default function Home() {
  const [showSendFunds, setShowSendFunds] = useState(false);
  const [showSignMessage, setShowSignMessage] = useState(false);

  // Read user from localStorage
  const user = getCurrentUser();

  const copyAddress = () => {
    if (user) {
      navigator.clipboard.writeText(user.smartAccountAddress);
      toast.success('Address copied!');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-primary/10 p-4">
      <main className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Circle Smart Wallet</h1>
          <p className="text-muted-foreground">Passkey authentication with gasless transactions</p>
        </div>

        <Card className="shadow-2xl border-primary/10">
          <CardContent className="p-8">
            {user ? (
              <div className="flex flex-col gap-6">
                {/* Wallet button */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">My Wallet</h2>
                  <ConnectWallet />
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

                <div className="grid grid-cols-3 gap-4">
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
                  <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setShowSignMessage(true)}>
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                      <FileSignature className="w-8 h-8 mb-2 text-primary" />
                      <h3 className="font-semibold">Sign</h3>
                      <p className="text-xs text-muted-foreground mt-1">Sign message</p>
                    </CardContent>
                  </Card>
                </div>

                <SendCalls
                  account={user}
                  open={showSendFunds}
                  onClose={() => setShowSendFunds(false)}
                  // chain={polygonAmoy} // Optional: fix to specific chain, otherwise user can select
                  calls={[
                    {
                      contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // USDC on Base Sepolia
                      value: '0',
                      abi: [
                        {
                          name: 'transfer',
                          type: 'function',
                          stateMutability: 'nonpayable',
                          inputs: [
                            { name: 'to', type: 'address' },
                            { name: 'amount', type: 'uint256' },
                          ],
                          outputs: [{ name: '', type: 'bool' }],
                        },
                      ] as const,
                      functionName: 'transfer',
                      parameters: [
                        '0xE08224B2CfaF4f27E2DC7cB3f6B99AcC68Cf06c0' as Address,
                        parseUnits('1', 6), // 1 USDC
                      ],
                    },
                  ]}
                />

                <SignTypedData
                  account={user}
                  open={showSignMessage}
                  onClose={() => setShowSignMessage(false)}
                  chain={baseSepolia}
                  domain={{
                    name: 'MyDApp',
                    version: '1',
                    chainId: baseSepolia.id,
                    verifyingContract: '0x1234567890123456789012345678901234567890' as Address,
                  }}
                  types={{
                    Permit: [
                      { name: 'owner', type: 'address' },
                      { name: 'spender', type: 'address' },
                      { name: 'value', type: 'uint256' },
                      { name: 'nonce', type: 'uint256' },
                      { name: 'deadline', type: 'uint256' },
                    ],
                  }}
                  primaryType="Permit"
                  message={{
                    owner: user.smartAccountAddress as Address,
                    spender: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
                    value: parseUnits('100', 6), // 100 USDC
                    nonce: 0,
                    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                  }}
                />

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
            ) : (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                  <p className="text-sm text-muted-foreground">
                    Use biometrics to access your smart wallet
                  </p>
                </div>
                <ConnectWallet />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
