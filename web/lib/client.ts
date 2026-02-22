import { createPublicClient, createWalletClient, custom, http } from "viem";
import { base } from "viem/chains";
import { ALCHEMY_API_KEY } from "./chains";

// Create public client that works on server and client
export const client = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
});

// Safely create wallet client only in browser environment
export const walletClient =
  typeof window !== "undefined"
    ? typeof (window as any).ethereum !== "undefined"
      ? createWalletClient({
          chain: base,
          transport: custom((window as any).ethereum),
        })
      : null
    : null;
