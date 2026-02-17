import { parseUnits } from 'viem';
import { webSocketService } from '../../lib/websockets';
import { USDC_TOKEN } from '../../lib/config';

const USDC_DECIMALS = 6;

/**
 * Withdraw USDC from the custody contract on Base
 * Uses the WebSocket service's NitroliteClient
 */
export async function withdrawFromCustody(amount: string): Promise<string> {
    // Wait for authentication to complete
    await webSocketService.waitForAuth();

    const nitroliteClient = webSocketService.getNitroliteClient();
    if (!nitroliteClient) {
        throw new Error('NitroliteClient not initialized');
    }

    const withdrawAmountInUnits = parseUnits(amount, USDC_DECIMALS);
    console.log(`💸 Withdrawing ${amount} USDC (${withdrawAmountInUnits} units) from custody...`);

    const withdrawHash = await nitroliteClient.withdrawal(USDC_TOKEN, withdrawAmountInUnits);
    console.log(`✅ Withdraw tx hash: ${withdrawHash}`);

    return withdrawHash;
}
