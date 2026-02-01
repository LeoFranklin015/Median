import { sepolia } from 'viem/chains';

export const CHAIN_ID = sepolia.id;
export const USDC_TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

export const AUTH_ALLOWANCES = [{
    asset: 'usdc',
    amount: '1',
}];

export default function getContractAddresses() {
    return {
        custody: '0x34BaaF75820C4256D25A0bF19c8B5FAdEf9A4d4C',
        adjudicator: '0xD3F3615E2F5a60bF4e4f8e7ac80EBD21038311Bc',
    }
}