import { createPublicClient, createWalletClient, custom, http } from "viem";
import { baseSepolia } from "viem/chains";

// Create public client that works on server and client
export const client = createPublicClient({
  chain: baseSepolia,
  transport: http("https://endpoints.omniatech.io/v1/eth/sepolia/public"),
});

// Safely create wallet client only in browser environment
export const walletClient =
  typeof window !== "undefined"
    ? typeof (window as any).ethereum !== "undefined"
      ? createWalletClient({
          chain: baseSepolia,
          transport: custom((window as any).ethereum),
        })
      : null
    : null;
