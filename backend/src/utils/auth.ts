import { AuthChallengeResponse, createAuthRequestMessage, createEIP712AuthMessageSigner, createAuthVerifyMessage, RPCResponse, RPCMethod } from '@erc7824/nitrolite';
import { Client } from 'yellow-ts';

import { createPublicClient, createWalletClient, http, WalletClient } from 'viem'
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { generateSessionKey, SessionKey } from '../lib/sessionStore';

import { config } from 'dotenv'

config()

const AUTH_SCOPE = 'Median App';

const SESSION_DURATION = 7200; // 1 hour

export const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
})


const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);


export const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
})
export async function authenticate(client: Client): Promise<SessionKey> {
    const allowances = [{
        asset: 'usdc',
        amount: '1',
    }];
    const sessionKey = generateSessionKey();
    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);

    const authMessage = await createAuthRequestMessage({
        address: account.address,
        session_key: sessionKey.address,
        application: AUTH_SCOPE,
        allowances: allowances,
        expires_at: BigInt(sessionExpireTimestamp),
        scope: 'median.app',
    });

    async function handleAuthChallenge(message: AuthChallengeResponse) {

        const authParams = {
            scope: 'median.app',
            application: account.address,
            participant: sessionKey.address,
            expire: sessionExpireTimestamp,
            allowances: allowances,
            session_key: sessionKey.address,
            expires_at: BigInt(sessionExpireTimestamp),
        };

        const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, { name: AUTH_SCOPE });

        const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, message);

        await client.sendMessage(authVerifyMessage);

    }

    client.listen(async (message: RPCResponse) => {

        if (message.method === RPCMethod.AuthChallenge) {
            await handleAuthChallenge(message);
        }
    })

    await client.sendMessage(authMessage)

    return sessionKey;

}