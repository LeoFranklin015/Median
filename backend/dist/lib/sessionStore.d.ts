import { type Address } from 'viem';
export interface SessionKey {
    privateKey: `0x${string}`;
    address: Address;
}
export declare const generateSessionKey: () => SessionKey;
export declare const getStoredSessionKey: () => SessionKey | null;
export declare const storeSessionKey: (sessionKey: SessionKey) => void;
export declare const removeSessionKey: () => void;
export declare const getStoredJWT: () => string | null;
export declare const storeJWT: (token: string) => void;
export declare const removeJWT: () => void;
//# sourceMappingURL=sessionStore.d.ts.map