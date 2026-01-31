import { type WebAuthnCredential, WebAuthnMode } from '@circle-fin/modular-wallets-core';
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
} from '@circle-fin/modular-wallets-core';
import { createPublicClient, type Chain } from 'viem';
import { polygonAmoy, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { toWebAuthnAccount, createBundlerClient } from 'viem/account-abstraction';

export interface PasskeyConfig {
  clientKey: string;
  clientUrl: string;
}

export function getPasskeyConfig(): PasskeyConfig {
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY;
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL;

  if (!clientKey || !clientUrl) {
    throw new Error('Circle environment variables are not defined');
  }

  return { clientKey, clientUrl };
}

/**
 * Map viem chain to Circle SDK chain identifier
 */
function getCircleChainName(chain: Chain): string {
  const chainMap: Record<number, string> = {
    [polygonAmoy.id]: 'polygonAmoy',
    [sepolia.id]: 'sepolia',
    [baseSepolia.id]: 'baseSepolia',
    [arbitrumSepolia.id]: 'arbitrumSepolia',
  };

  const chainName = chainMap[chain.id];
  if (!chainName) {
    throw new Error(`Unsupported chain: ${chain.name} (${chain.id})`);
  }

  return chainName;
}

/**
 * Register a new passkey for a username
 */
export async function registerWithPasskey(username: string): Promise<WebAuthnCredential> {
  const { clientKey, clientUrl } = getPasskeyConfig();

  console.log('🔐 Starting passkey registration for:', username);

  try {
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: WebAuthnMode.Register,
      username,
    });

    console.log('✅ Passkey registration successful');
    return credential;
  } catch (error) {
    console.error('❌ Passkey registration failed:', error);
    throw error;
  }
}

/**
 * Login with existing passkey
 */
export async function loginWithPasskey(
  username: string,
  credentialId?: string
): Promise<WebAuthnCredential> {
  const { clientKey, clientUrl } = getPasskeyConfig();

  console.log('🔐 Starting passkey login for:', username);

  try {
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: WebAuthnMode.Login,
      username,
      ...(credentialId && { credentialId }), // Use specific credential if provided
    });

    console.log('✅ Passkey login successful');
    return credential;
  } catch (error) {
    console.error('❌ Passkey login failed:', error);
    throw error;
  }
}

/**
 * Create Circle smart account from credential
 */
export async function createSmartAccountFromPasskey(
  credential: WebAuthnCredential,
  chain: Chain = polygonAmoy
) {
  const { clientKey, clientUrl } = getPasskeyConfig();

  const chainName = getCircleChainName(chain);

  const modularTransport = toModularTransport(
    `${clientUrl}/${chainName}`,
    clientKey
  );

  const client = createPublicClient({
    chain,
    transport: modularTransport,
  });

  const webAuthnAccount = toWebAuthnAccount({ credential });

  const smartAccount = await toCircleSmartAccount({
    client,
    owner: webAuthnAccount,
  });

  const bundlerClient = createBundlerClient({
    account: smartAccount,
    chain,
    transport: modularTransport,
  });

  return { smartAccount, bundlerClient, client };
}

/**
 * Get smart account address without creating full account
 */
export async function getSmartAccountAddress(
  credential: WebAuthnCredential,
  chain: Chain = polygonAmoy
): Promise<string> {
  const { smartAccount } = await createSmartAccountFromPasskey(credential, chain);
  return smartAccount.address;
}
