"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeJWT = exports.storeJWT = exports.getStoredJWT = exports.removeSessionKey = exports.storeSessionKey = exports.getStoredSessionKey = exports.generateSessionKey = void 0;
const accounts_1 = require("viem/accounts");
let sessionKeyStore = null;
let jwtStore = null;
const generateSessionKey = () => {
    const privateKey = (0, accounts_1.generatePrivateKey)();
    const account = (0, accounts_1.privateKeyToAccount)(privateKey);
    return { privateKey, address: account.address };
};
exports.generateSessionKey = generateSessionKey;
const getStoredSessionKey = () => {
    return sessionKeyStore;
};
exports.getStoredSessionKey = getStoredSessionKey;
const storeSessionKey = (sessionKey) => {
    sessionKeyStore = sessionKey;
};
exports.storeSessionKey = storeSessionKey;
const removeSessionKey = () => {
    sessionKeyStore = null;
};
exports.removeSessionKey = removeSessionKey;
const getStoredJWT = () => {
    return jwtStore;
};
exports.getStoredJWT = getStoredJWT;
const storeJWT = (token) => {
    jwtStore = token;
};
exports.storeJWT = storeJWT;
const removeJWT = () => {
    jwtStore = null;
};
exports.removeJWT = removeJWT;
//# sourceMappingURL=sessionStore.js.map