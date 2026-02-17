"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { http } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { YellowNetworkProvider } from "@/lib/yellowNetwork";
import { SUPPORTED_CHAINS, ALCHEMY_API_KEY, base } from "@/lib/chains";
import { ENSCheck } from "@/components/ENSCheck";

const config = getDefaultConfig({
  appName: "Median",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  chains: SUPPORTED_CHAINS as any,
  ssr: true,
  transports: {
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
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
