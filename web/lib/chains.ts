import { defineChain } from "viem"
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
} from "wagmi/chains"

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
