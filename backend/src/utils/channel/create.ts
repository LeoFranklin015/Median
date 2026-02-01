import { webSocketService } from '../../lib/websockets';

export async function createChannelOnChain() {
    const result = await webSocketService.createChannelOnChain();
    console.log(`✅ Channel ${result.channelId} created on-chain (tx: ${result.txHash})`);
    return result;
}