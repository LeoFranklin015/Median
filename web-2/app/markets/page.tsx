"use client"

import { MarketNavbar } from "@/components/markets/MarketNavbar"
import { MarketTickerBar } from "@/components/markets/MarketTickerBar"
import { AssetColumns } from "@/components/markets/AssetColumns"
import { ProductGrid } from "@/components/markets/ProductGrid"
import { useStockQuotes } from "@/hooks/useStockQuotes"

export default function MarketsPage() {
  const { assets, loading, error } = useStockQuotes()

  return (
    <div className="min-h-screen bg-zinc-50">
      <MarketNavbar />
      <main className="pt-24 pb-16">
        <MarketTickerBar />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <AssetColumns assets={assets} loading={loading} />
          <ProductGrid assets={assets} loading={loading} error={error} />
        </div>
      </main>
    </div>
  )
}
