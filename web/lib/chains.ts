import { defineChain } from "viem"
import {
  sepolia as sepoliaBase,
  baseSepolia as baseSepoliaBase,
  arbitrumSepolia as arbitrumSepoliaBase,
  optimismSepolia as optimismSepoliaBase,
} from "wagmi/chains"

// Alchemy API key for RPC
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ""

// Override chains with Alchemy RPC URLs
export const sepolia = {
  ...sepoliaBase,
  rpcUrls: {
    ...sepoliaBase.rpcUrls,
    default: {
      http: [`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
} as const

export const baseSepolia = {
  ...baseSepoliaBase,
  rpcUrls: {
    ...baseSepoliaBase.rpcUrls,
    default: {
      http: [`https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
} as const

export const arbitrumSepolia = {
  ...arbitrumSepoliaBase,
  rpcUrls: {
    ...arbitrumSepoliaBase.rpcUrls,
    default: {
      http: [`https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
} as const

export const optimismSepolia = {
  ...optimismSepoliaBase,
  rpcUrls: {
    ...optimismSepoliaBase.rpcUrls,
    default: {
      http: [`https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
} as const

// Arc Testnet - custom chain (not in wagmi/chains)
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
})

// All supported chains for the app
export const SUPPORTED_CHAINS = [
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  arcTestnet,
] as const

// Chain metadata for UI (dropdowns, labels)
export const CHAIN_OPTIONS = [
  { id: "ethereum-sepolia", name: "Ethereum Sepolia", chainId: sepolia.id },
  { id: "base-sepolia", name: "Base Sepolia", chainId: baseSepolia.id },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", chainId: arbitrumSepolia.id },
  { id: "optimism-sepolia", name: "Optimism Sepolia", chainId: optimismSepolia.id },
  { id: "arc-testnet", name: "Arc Testnet", chainId: arcTestnet.id },
] as const

// Chain logo URLs (DefiLlama CDN for mainnet logos; Arc uses official favicon)
export const CHAIN_LOGOS: Record<string, string> = {
  "ethereum-sepolia": "https://icons.llama.fi/chains/rsz_ethereum.jpg",
  "base-sepolia": "https://icons.llama.fi/chains/rsz_base.jpg",
  "arbitrum-sepolia": "https://icons.llama.fi/chains/rsz_arbitrum.jpg",
  "optimism-sepolia": "https://icons.llama.fi/chains/rsz_optimism.jpg",
  "arc-testnet": "https://testnet.arcscan.app/favicon.ico",
}

// USDC token address per chain (testnet)
export const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  [sepolia.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  [arbitrumSepolia.id]: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as `0x${string}`,
  [optimismSepolia.id]: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" as `0x${string}`,
  [arcTestnet.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`, // Same as Sepolia if bridged
}
