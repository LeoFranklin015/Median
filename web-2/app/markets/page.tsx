"use client"

import { MarketNavbar } from "@/components/markets/MarketNavbar"
import { MarketTickerBar } from "@/components/markets/MarketTickerBar"
import { AssetColumns } from "@/components/markets/AssetColumns"
import { ProductGrid } from "@/components/markets/ProductGrid"

export default function MarketsPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <MarketNavbar />
      <main className="pt-24 pb-16">
        <MarketTickerBar />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <AssetColumns />
          <ProductGrid />
        </div>
      </main>
    </div>
  )
}
