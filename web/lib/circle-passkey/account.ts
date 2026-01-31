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
 * Verify user with biometric authentication using specific credential
 * This triggers biometric prompt without showing selection screen
 */
async function verifyWithBiometric(credentialId: string): Promise<void> {
  console.log('🔧 Verifying user with biometric...');

  // Create a challenge (random bytes)
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // Convert base64url credential ID to buffer
  const base64url = credentialId.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(base64url);
  const credentialIdBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    credentialIdBuffer[i] = binaryString.charCodeAt(i);
  }

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    allowCredentials: [{
      id: credentialIdBuffer,
      type: 'public-key',
      transports: ['internal', 'hybrid'] as AuthenticatorTransport[],
    }],
    userVerification: 'required',
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('Biometric verification failed');
  }

  console.log('✅ Biometric verification successful');
}

/**
 * Login with existing passkey
 * If stored credential is provided, verifies with biometric then returns it
 * Otherwise uses Circle's authentication flow
 */
export async function loginWithPasskey(
  username: string,
  credentialId?: string,
  storedCredential?: WebAuthnCredential
): Promise<WebAuthnCredential> {
  console.log('🔐 Starting passkey login for:', username);
  console.log('🔑 Credential ID:', credentialId || 'none provided');

  try {
    // If we have a stored credential, verify with biometric first
    if (storedCredential && credentialId) {
      console.log('🔐 Verifying with biometric (no selection screen)...');
      await verifyWithBiometric(credentialId);
      console.log('✅ Using verified credential');
      return storedCredential;
    }

    // Otherwise, use Circle's authentication flow
    const { clientKey, clientUrl } = getPasskeyConfig();
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: WebAuthnMode.Login,
      username,
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
