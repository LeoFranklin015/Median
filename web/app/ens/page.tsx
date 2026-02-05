'use client';
import { useAddSubname, useIsSubnameAvailable } from '@justaname.id/react';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function AddSubname() {
  const { isConnected } = useAccount();
  const [username, setUsername] = useState<string>('');
  const { isSubnameAvailable } = useIsSubnameAvailable({ 
    username: username 
  });
  const { addSubname } = useAddSubname();

  return (
    <div>
      <h1>Claim your subdomain</h1>
      <ConnectButton />
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter a subdomain"
      />
      <button
        onClick={() => addSubname({ username })}
        disabled={!isSubnameAvailable || !isConnected || !username}
      >
        Claim
      </button>
    </div>
  );
};
