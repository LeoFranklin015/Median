import { createPublicClient, type Chain } from 'viem';

import {
  toModularTransport,
  toCircleSmartAccount,
  walletClientToLocalAccount
} from '@circle-fin/modular-wallets-core';
import type { WalletClient } from 'viem';

export interface CircleConfig {
  clientKey: string;
  url: string;
  chain?: Chain;
}

/**
 * Creates a public client configured for Circle's modular SDK
 * Default chain is Polygon Amoy (testnet)
 */
export async function createCircleClient(config: CircleConfig) {
  const chain = config.chain!;
  const chainName = chain.name.toLowerCase().replace(/\s+/g, '');

  return createPublicClient({
    chain,
    transport: toModularTransport(`${config.url}/${chainName}`, config.clientKey),
  });
}

export async function createSmartAccountFromWallet(
  walletClient: WalletClient,
  config: CircleConfig
) {
  const client = await createCircleClient(config);

  // Convert wallet client to local account for Circle
  const localAccount = walletClientToLocalAccount(walletClient);

  // Create Circle Smart Account
  const smartAccount = await toCircleSmartAccount({
    client,
    owner: localAccount,
  });

  return { smartAccount, client };
}

export function getCircleConfig(): CircleConfig {
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
  const url = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;

  if (!clientKey || !url) {
    throw new Error('Circle environment variables are not defined');
  }

  return { clientKey, url };
}
