import { webSocketService } from '../../lib/websockets';

export interface CreateAppSessionParams {
    participants: string[];
    allocations: { participant: string; asset: string; amount: string }[];
    applicationName?: string;
}

/**
 * Create a multi-party app session
 * @param params - Session parameters including participants and allocations
 */
export async function createAppSession(params: CreateAppSessionParams): Promise<{ appSessionId: string }> {
    const result = await webSocketService.createAppSession(
        params.participants,
        params.allocations,
        params.applicationName || 'Median App'
    );
    console.log(`✅ App session created: ${result.appSessionId}`);
    return result;
}