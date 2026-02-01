import { webSocketService } from '../../lib/websockets';

export interface SubmitAppStateParams {
    appSessionId: string;
    allocations: { participant: string; asset: string; amount: string }[];
}

/**
 * Submit updated state for an app session
 * @param params - State parameters including session ID and new allocations
 */
export async function submitAppState(params: SubmitAppStateParams): Promise<{ success: boolean }> {
    const result = await webSocketService.submitAppState(
        params.appSessionId,
        params.allocations
    );
    console.log(`✅ App state submitted for session: ${params.appSessionId}`);
    return result;
}
