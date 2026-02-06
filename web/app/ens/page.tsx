'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

// Note: Run `bun add @justaname.id/react @justaname.id/sdk` to enable subname claiming

export default function AddSubname() {
  const { isConnected } = useAccount();
  const [username, setUsername] = useState<string>('');

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Claim your subdomain</h1>
      <p className="text-muted-foreground">
        Install @justaname.id packages to enable: <code className="bg-muted px-2 py-1 rounded">bun add @justaname.id/react @justaname.id/sdk</code>
      </p>
      <ConnectButton />
      <input
        className="border rounded px-4 py-2 w-full max-w-md"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter a subdomain"
        disabled
      />
      <button
        className="px-4 py-2 bg-muted rounded cursor-not-allowed"
        disabled
      >
        Claim (requires JustaName packages)
      </button>
    </div>
  );
}
