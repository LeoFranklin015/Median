import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { SessionKey } from './types';
import { SESSION_KEY_STORAGE } from './config';

/**
 * Generate a new session key pair
 */
export const generateSessionKey = (): SessionKey => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
};

/**
 * Get stored session key from localStorage
 */
export const getStoredSessionKey = (): SessionKey | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_KEY_STORAGE);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SessionKey;
  } catch {
    return null;
  }
};

/**
 * Store session key to localStorage
 */
export const storeSessionKey = (key: SessionKey): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(key));
};

/**
 * Clear session key from localStorage
 */
export const clearSessionKey = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY_STORAGE);
};

/**
 * Get or create a session key
 */
export const getOrCreateSessionKey = (): SessionKey => {
  const existing = getStoredSessionKey();
  if (existing) {
    return existing;
  }
  const newKey = generateSessionKey();
  storeSessionKey(newKey);
  return newKey;
};
