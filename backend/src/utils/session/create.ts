import { config } from 'dotenv'
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { generateSessionKey } from '../../lib/sessionStore';
import { webSocketService } from '../../lib/websockets';
import { 
    createAuthRequestMessage, 
    createAuthVerifyMessage,
    createCreateChannelMessage,
    createEIP712AuthMessageSigner, 
    createECDSAMessageSigner,
    AuthChallengeResponse, 
    RPCMethod, 
    RPCResponse, 
    NitroliteClient,
    WalletStateSigner,
    Channel,
    StateIntent,
    Allocation,
    ContractAddresses
} from '@erc7824/nitrolite';

config()

function getBaseContractAddresses() {
    return {
        custody: '0xd4EF092EB2fB036aff0e2B5e8DabFA82D59abF81',
        adjudicator: '0x8cbC59ce0c22Eb787DD9F68167EB826D015AF264',
    }
}

const USDC_TOKEN_BASE = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
const BASE_CHAIN_ID = sepolia.id;

export async function main() {
    // Load the wallet from the environment variable
    const wallet = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    
    const walletClient = createWalletClient({
        account: wallet,
        chain: sepolia,
        transport: http(),
    })

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
    })

    const sessionKey = generateSessionKey();
    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

    const sessionExpireTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600);

    // Step 1: Request authentication
    const authMessage = await createAuthRequestMessage({
        address: wallet.address,
        session_key: sessionKey.address,
        application: 'Test app',
        allowances: [{
            asset: 'usdc',
            amount: '0.01',
        }],
        expires_at: BigInt(sessionExpireTimestamp),
        scope: 'test.app',
    })

    webSocketService.send(authMessage);

    webSocketService.addMessageListener(async (message: RPCResponse) => {
        switch (message.method) {
            case RPCMethod.AuthChallenge:
                console.log('🔐 Received auth challenge');

                const authParams = {
                    scope: 'test.app',
                    application: wallet.address,
                    participant: sessionKey.address,
                    expire: sessionExpireTimestamp,
                    allowances: [{
                        asset: 'usdc',
                        amount: '0.01',
                    }],
                    session_key: sessionKey.address,
                    expires_at: BigInt(sessionExpireTimestamp),
                }

                const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, { name: 'Test app' });
                const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, message as AuthChallengeResponse);

                webSocketService.send(authVerifyMessage);
                break;

            case RPCMethod.AuthVerify:
                if (message.params.success) {
                    console.log('✅ Authentication successful');

                    // Step 2: Create a channel for USDC on Base
                    const createChannelMessage = await createCreateChannelMessage(sessionSigner, {
                        chain_id: BASE_CHAIN_ID,
                        token: USDC_TOKEN_BASE as `0x${string}`,
                    });

                    console.log('📤 Creating channel for USDC on Base...');
                    webSocketService.send(createChannelMessage);
                } else {
                    console.error('❌ Authentication failed:', message.params);
                }
                break;

            case RPCMethod.CreateChannel:
                // Step 3: Log the channel details
                console.log('🧬 Channel created successfully!');
                console.log('\n📋 Channel Details:');
                console.log('Channel', message);
                console.log("Participants", message.params.channel.participants);

                const nitroliteClient = new NitroliteClient({
                    walletClient,
                    publicClient: publicClient as any,
                    stateSigner: new WalletStateSigner(walletClient),
                    addresses: getBaseContractAddresses() as ContractAddresses,
                    chainId: BASE_CHAIN_ID,
                    challengeDuration: 3600n,
                });
                //console.log(JSON.stringify(message.params, null, 2));

                const { channelId, txHash } = await nitroliteClient.createChannel({
                    channel: message.params.channel as unknown as Channel,
                    unsignedInitialState: {
                        intent: message.params.state.intent as StateIntent,
                        version: BigInt(message.params.state.version),
                        data: message.params.state.stateData as `0x${string}`,
                        allocations: message.params.state.allocations as Allocation[],
                    },
                    serverSignature: message.params.serverSignature as `0x${string}`,                    
                });

                console.log(`🧬 Channel ${channelId} created (tx: ${txHash})`);                
        }
    })
}

if (require.main === module) {
    main().catch(console.error);
}