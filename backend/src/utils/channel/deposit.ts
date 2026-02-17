import { parseUnits } from 'viem';
import { webSocketService } from '../../lib/websockets';
import { USDC_TOKEN } from '../../lib/config';

const USDC_DECIMALS = 6;

/**
 * Deposit USDC to the custody contract on Base
 * Uses the WebSocket service's NitroliteClient
 */
export async function depositToCustody(amount: string): Promise<string> {
    // Wait for authentication to complete
    await webSocketService.waitForAuth();

    const nitroliteClient = webSocketService.getNitroliteClient();
    if (!nitroliteClient) {
        throw new Error('NitroliteClient not initialized');
    }

    const depositAmountInUnits = parseUnits(amount, USDC_DECIMALS);
    console.log(`💰 Depositing ${amount} USDC (${depositAmountInUnits} units) to custody...`);

    const depositHash = await nitroliteClient.deposit(USDC_TOKEN, depositAmountInUnits);
    console.log(`✅ Deposit tx hash: ${depositHash}`);

    return depositHash;
}
