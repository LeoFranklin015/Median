import { type PublicClient, type WalletClient } from 'viem';
import { NitroliteClient } from '@erc7824/nitrolite';
import { type ChainConfig } from './config';
interface ChainClients {
    publicClient: PublicClient;
    walletClient: WalletClient;
    nitroliteClient: NitroliteClient;
    config: ChainConfig;
}
declare class ChainClientManager {
    private clients;
    private wallet;
    private getWallet;
    getClients(chainId: number): ChainClients;
    getNitroliteClient(chainId: number): NitroliteClient;
    getWalletAddress(): `0x${string}`;
    getTokenAllowance(chainId: number): Promise<bigint>;
    approveTokens(chainId: number, amount: bigint): Promise<string>;
    depositToCustody(chainId: number, amount: bigint): Promise<string>;
    withdrawFromCustody(chainId: number, amount: bigint): Promise<string>;
    getCustodyBalance(chainId: number): Promise<bigint>;
}
export declare const chainClientManager: ChainClientManager;
export {};
//# sourceMappingURL=chainClients.d.ts.map