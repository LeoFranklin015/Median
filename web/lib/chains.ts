import { base as baseMainnet } from "wagmi/chains"

// Alchemy API key for RPC
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ""

// Base mainnet with Alchemy RPC URL
export const base = {
  ...baseMainnet,
  rpcUrls: {
    ...baseMainnet.rpcUrls,
    default: {
      http: [`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
} as const

// All supported chains for the app (only Base mainnet)
export const SUPPORTED_CHAINS = [base] as const

// Chain metadata for UI (dropdowns, labels)
export const CHAIN_OPTIONS = [
  { id: "base", name: "Base", chainId: base.id },
] as const

// Chain logo URLs
export const CHAIN_LOGOS: Record<string, string> = {
  "base": "https://icons.llama.fi/chains/rsz_base.jpg",
}

// Block explorer base URLs for token/address links
export const BLOCK_EXPLORER_BASE: Record<number, string> = {
  [base.id]: "https://basescan.org",
}

// Get chain option by chainId (for logo, name, etc.)
export function getChainOptionByChainId(chainId: number) {
  return CHAIN_OPTIONS.find((c) => c.chainId === chainId)
}

// USDC token address on Base mainnet
export const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
}
