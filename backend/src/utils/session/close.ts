import { webSocketService } from '../../lib/websockets';

export interface CloseAppSessionParams {
    appSessionId: string;
    allocations: { participant: string; asset: string; amount: string }[];
}

/**
 * Close an app session with final allocations
 * @param params - Close parameters including session ID and final allocations
 */
export async function closeAppSession(params: CloseAppSessionParams): Promise<{ success: boolean }> {
    const result = await webSocketService.closeAppSession(
        params.appSessionId,
        params.allocations
    );
    console.log(`✅ App session closed: ${params.appSessionId}`);
    return result;
}
