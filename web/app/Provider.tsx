"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { http } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { YellowNetworkProvider } from "@/lib/yellowNetwork";
import { SUPPORTED_CHAINS, ALCHEMY_API_KEY, sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, arcTestnet } from "@/lib/chains";
import { ENSCheck } from "@/components/ENSCheck";

const config = getDefaultConfig({
  appName: "Median",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  chains: SUPPORTED_CHAINS as any,
  ssr: true,
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [baseSepolia.id]: http(`https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [arbitrumSepolia.id]: http(`https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [optimismSepolia.id]: http(`https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
});

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="median-theme">
          <RainbowKitProvider>
            <YellowNetworkProvider>
              <ENSCheck />
              {children}
            </YellowNetworkProvider>
          </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
