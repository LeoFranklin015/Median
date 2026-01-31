import type { WebAuthnCredential } from '@circle-fin/modular-wallets-core';

export interface StoredAccount {
  username: string;
  smartAccountAddress: string;
  credentialId: string;
  credential: WebAuthnCredential; // Store the full credential
  lastUsed: number;
}

const STORAGE_KEY_ACCOUNTS = 'circle_accounts';
const STORAGE_KEY_CURRENT_USER = 'circle_current_user';

export function getSavedAccounts(): StoredAccount[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveAccount(account: StoredAccount) {
  if (typeof window === 'undefined') return;

  const accounts = getSavedAccounts();
  const existing = accounts.findIndex(a => a.username === account.username);

  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.push(account);
  }

  // Keep only last 5 accounts, sorted by most recent
  const sorted = accounts.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 5);
  localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(sorted));
}

export function getCurrentUser(): StoredAccount | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setCurrentUser(account: StoredAccount | null) {
  if (typeof window === 'undefined') return;

  if (account) {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(account));
    // Also update last used time in accounts list
    saveAccount({ ...account, lastUsed: Date.now() });
  } else {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  }
}
