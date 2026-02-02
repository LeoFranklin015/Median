"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { YellowNetworkProvider } from "@/lib/yellowNetwork";

const config = getDefaultConfig({
  appName: "Median",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  chains: [sepolia, baseSepolia],
  ssr: true,
});

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="median-theme">
          <RainbowKitProvider>
            <YellowNetworkProvider>{children}</YellowNetworkProvider>
          </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
