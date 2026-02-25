"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletClient = exports.publicClient = void 0;
exports.authenticate = authenticate;
const nitrolite_1 = require("@erc7824/nitrolite");
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const sessionStore_1 = require("../lib/sessionStore");
const config_1 = require("../lib/config");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const AUTH_SCOPE = 'Median App';
const SESSION_DURATION = 7200;
exports.publicClient = (0, viem_1.createPublicClient)({
    chain: chains_1.base,
    transport: (0, viem_1.http)(config_1.ALCHEMY_RPC_URL),
});
const account = (0, accounts_1.privateKeyToAccount)(process.env.PRIVATE_KEY);
exports.walletClient = (0, viem_1.createWalletClient)({
    account,
    chain: chains_1.base,
    transport: (0, viem_1.http)(config_1.ALCHEMY_RPC_URL),
});
async function authenticate(client) {
    const allowances = [
        { asset: 'usdc', amount: '1000000000' },
    ];
    const sessionKey = (0, sessionStore_1.generateSessionKey)();
    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);
    const authMessage = await (0, nitrolite_1.createAuthRequestMessage)({
        address: account.address,
        session_key: sessionKey.address,
        application: AUTH_SCOPE,
        allowances: allowances,
        expires_at: BigInt(sessionExpireTimestamp),
        scope: 'median.app',
    });
    async function handleAuthChallenge(message) {
        const authParams = {
            scope: 'median.app',
            application: account.address,
            participant: sessionKey.address,
            expire: sessionExpireTimestamp,
            allowances: allowances,
            session_key: sessionKey.address,
            expires_at: BigInt(sessionExpireTimestamp),
        };
        const eip712Signer = (0, nitrolite_1.createEIP712AuthMessageSigner)(exports.walletClient, authParams, { name: AUTH_SCOPE });
        const authVerifyMessage = await (0, nitrolite_1.createAuthVerifyMessage)(eip712Signer, message);
        await client.sendMessage(authVerifyMessage);
    }
    client.listen(async (message) => {
        if (message.method === nitrolite_1.RPCMethod.AuthChallenge) {
            await handleAuthChallenge(message);
        }
    });
    await client.sendMessage(authMessage);
    return sessionKey;
}
//# sourceMappingURL=auth.js.map