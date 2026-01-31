import { createPublicClient, createWalletClient, custom, type Address } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { createBundlerClient, toWebAuthnAccount } from 'viem/account-abstraction';
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
  WebAuthnMode,
  type WebAuthnCredential,
} from '@circle-fin/modular-wallets-core';

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
 * Register a new user with passkey authentication
 */
export async function registerWithPasskey(username: string): Promise<WebAuthnCredential> {
  const { clientKey, clientUrl } = getPasskeyConfig();

  console.log('🔐 Starting passkey registration for:', username);
  console.log('📍 Client URL:', clientUrl);

  try {
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
    console.log('✅ Passkey transport created');

    console.log('🎯 Calling toWebAuthnCredential (biometric prompt should appear now)...');
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: WebAuthnMode.Register,
      username,
    });

    console.log('✅ Passkey registration successful!', credential);
    return credential;
  } catch (error) {
    console.error('❌ Passkey registration failed:', error);
    throw error;
  }
}

/**
 * Login an existing user with passkey authentication
 */
export async function loginWithPasskey(username: string): Promise<WebAuthnCredential> {
  const { clientKey, clientUrl } = getPasskeyConfig();

  console.log('🔐 Starting passkey login for:', username);
  console.log('📍 Client URL:', clientUrl);

  try {
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
    console.log('✅ Passkey transport created');

    console.log('🎯 Calling toWebAuthnCredential (biometric prompt should appear now)...');
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: WebAuthnMode.Login,
      username,
    });

    console.log('✅ Passkey login successful!', credential);
    return credential;
  } catch (error) {
    console.error('❌ Passkey login failed:', error);
    throw error;
  }
}

/**
 * Create a smart account from a WebAuthn credential
 */
export async function createSmartAccountFromPasskey(
  credential: WebAuthnCredential,
  chain: any = polygonAmoy
) {
  const { clientKey, clientUrl } = getPasskeyConfig();

  // Get chain name for URL
  const chainName = chain.name.toLowerCase().replace(/\s+/g, '');

  // Create modular transport with chain
  const modularTransport = toModularTransport(
    `${clientUrl}/${chainName}`,
    clientKey
  );

  // Create public client
  const client = createPublicClient({
    chain,
    transport: modularTransport,
  });

  // Create WebAuthn account from credential
  const webAuthnAccount = toWebAuthnAccount({ credential });

  // Create Circle Smart Account
  const smartAccount = await toCircleSmartAccount({
    client,
    owner: webAuthnAccount,
  });

  // Create bundler client for sending transactions
  const bundlerClient = createBundlerClient({
    account: smartAccount,
    chain,
    transport: modularTransport,
  });

  return { smartAccount, bundlerClient, client };
}

/**
 * Re-authenticate user and return fresh credential for transactions
 */
export async function reauthenticateForTransaction(username: string): Promise<WebAuthnCredential> {
  console.log('🔐 Re-authenticating for transaction:', username);

  try {
    // Use Login mode to re-authenticate
    const credential = await loginWithPasskey(username);
    console.log('✅ Re-authentication successful');
    return credential;
  } catch (error) {
    console.error('❌ Re-authentication failed:', error);
    throw new Error('Authentication required to send transactions');
  }
}

/**
 * Create a smart account from a connected wallet (e.g., MetaMask via Dynamic)
 */
export async function createSmartAccountFromWallet(
  walletProvider: any,
  walletAddress: Address,
  chain: any = polygonAmoy
) {
  const { clientKey, clientUrl } = getPasskeyConfig();

  console.log('🔗 Creating smart account from wallet:', walletAddress);

  // Get chain name for URL
  const chainName = chain.name.toLowerCase().replace(/\s+/g, '');

  // Create modular transport with chain
  const modularTransport = toModularTransport(
    `${clientUrl}/${chainName}`,
    clientKey
  );

  // Create public client
  const client = createPublicClient({
    chain,
    transport: modularTransport,
  });

  // Create wallet client from the provider
  const walletClient = createWalletClient({
    account: walletAddress,
    chain,
    transport: custom(walletProvider),
  });

  // Create Circle Smart Account with wallet as owner
  const smartAccount = await toCircleSmartAccount({
    client,
    owner: walletClient.account!,
  });

  // Create bundler client for sending transactions
  const bundlerClient = createBundlerClient({
    account: smartAccount,
    chain,
    transport: modularTransport,
  });

  console.log('✅ Smart account created from wallet:', smartAccount.address);

  return { smartAccount, bundlerClient, client };
}
