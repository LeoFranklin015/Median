// src/lib/sessionStore.ts
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { type Address } from 'viem'

export interface SessionKey {
  privateKey: `0x${string}`
  address: Address
}

let sessionKeyStore: SessionKey | null = null
let jwtStore: string | null = null

// Session key management

export const generateSessionKey = (): SessionKey => {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  return { privateKey, address: account.address }
}

export const getStoredSessionKey = (): SessionKey | null => {
  return sessionKeyStore
}

export const storeSessionKey = (sessionKey: SessionKey): void => {
  sessionKeyStore = sessionKey
}

export const removeSessionKey = (): void => {
  sessionKeyStore = null
}

// JWT helpers

export const getStoredJWT = (): string | null => {
  return jwtStore
}

export const storeJWT = (token: string): void => {
  jwtStore = token
}

export const removeJWT = (): void => {
  jwtStore = null
}
