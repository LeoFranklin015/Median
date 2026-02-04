import { sepolia } from 'viem/chains';

export const CHAIN_ID = sepolia.id;
export const USDC_TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;
export const AUTH_SCOPE = 'Median App';
export const SESSION_DURATION = 3600; // 1 hour in seconds

export const AUTH_ALLOWANCES = [
    { asset: 'usdc', amount: '100000000000' },
    // Stock tokens
    { asset: 'AAPL', amount: '100000000000' },
    { asset: 'AMZN', amount: '100000000000' },
    { asset: 'GOOG', amount: '100000000000' },
    { asset: 'MSFT', amount: '100000000000' },
    { asset: 'TSLA', amount: '100000000000' },
    { asset: 'NVDA', amount: '100000000000' },
    { asset: 'PFE', amount: '100000000000' },
    { asset: 'INTC', amount: '100000000000' },
    { asset: 'SOFI', amount: '100000000000' },
    { asset: 'OPEN', amount: '100000000000' },
    { asset: 'ONDS', amount: '100000000000' },
    { asset: 'META', amount: '100000000000' },
    { asset: 'NFLX', amount: '100000000000' },
    { asset: 'AMD', amount: '100000000000' },
    { asset: 'JPM', amount: '100000000000' },
];

export default function getContractAddresses() {
    return {
        custody: '0xc4afa9235be46a337850B33B12C222F6a3ba1EEC',
        adjudicator: '0x8F6C8F2904Aa3A84080228455e40b47c1EC0a8d3',
    }
}