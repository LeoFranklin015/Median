"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { YellowNetworkProvider } from "@/lib/yellowNetwork";
import { JustaNameProvider } from '@justaname.id/react';
import { ChainId } from "@justaname.id/sdk";


const config = getDefaultConfig({
  appName: "Median",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  chains: [sepolia, baseSepolia],
  ssr: true,
});

const justaNameConfig = {
  config: {
   origin: "http://localhost:3000/",
   domain: "localhost",
   signInTtl: 86400000,
 },
ensDomains: [
  { 
    chainId: 11155111 as ChainId, 
    ensDomain: 'median.eth',
    apiKey: process.env.NEXT_PUBLIC_JUSTA_NAME_API_KEY as string 
  }
],
networks: [{ chainId: 11155111 as ChainId, providerUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`}],
};

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="median-theme">
          <RainbowKitProvider>
            <YellowNetworkProvider>
              <JustaNameProvider config={justaNameConfig}>
                {children}
              </JustaNameProvider>
            </YellowNetworkProvider>
          </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
