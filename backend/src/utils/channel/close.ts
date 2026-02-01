import { webSocketService } from '../../lib/websockets';

/**
 * Close a channel on-chain
 * Sends close request via WebSocket, waits for server approval, then executes on-chain
 */
export async function closeChannelOnChain(channelId: string): Promise<{ txHash: string }> {
    const result = await webSocketService.closeChannelOnChain(channelId);
    console.log(`✅ Channel ${channelId} closed on-chain (tx: ${result.txHash})`);
    return result;
}
