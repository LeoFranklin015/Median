import { parseUnits } from 'viem';
import { webSocketService } from '../../lib/websockets';

const USDC_DECIMALS = 6;

/**
 * Resize a channel on-chain
 * @param channelId - The channel ID to resize
 * @param resizeAmount - Amount in USDC to add/remove from channel (positive=add, negative=remove)
 * @param allocateAmount - Amount in USDC to allocate/deallocate (positive=allocate, negative=deallocate)
 */
export async function resizeChannelOnChain(
    channelId: string,
    resizeAmount?: string,
    allocateAmount?: string
): Promise<{ txHash: string }> {
    const resizeAmountBigInt = resizeAmount !== undefined
        ? parseUnits(resizeAmount, USDC_DECIMALS)
        : undefined;

    const allocateAmountBigInt = allocateAmount !== undefined
        ? parseUnits(allocateAmount, USDC_DECIMALS)
        : undefined;

    const result = await webSocketService.resizeChannelOnChain(
        channelId,
        resizeAmountBigInt,
        allocateAmountBigInt
    );

    console.log(`✅ Channel ${channelId} resized on-chain (tx: ${result.txHash})`);
    return result;
}
