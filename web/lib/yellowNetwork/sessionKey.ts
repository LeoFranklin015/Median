import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { SessionKey } from './types';

/**
 * Generate a new session key pair
 */
export const generateSessionKey = (): SessionKey => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
};

/**
 * Get or create a session key (always generates fresh key)
 */
export const getOrCreateSessionKey = (): SessionKey => {
  return generateSessionKey();
};

// Legacy functions kept for compatibility but now no-ops
export const getStoredSessionKey = (): SessionKey | null => null;
export const storeSessionKey = (_key: SessionKey): void => {};
export const clearSessionKey = (): void => {};
