"use client"

import { PortfolioNavbar } from "@/components/PortfolioNavbar"

// import { MarketTickerBar } from "@/components/markets/MarketTickerBar"
// import { AssetColumns } from "@/components/markets/AssetColumns"
// import { ProductGrid } from "@/components/markets/ProductGrid"
// import { useStockQuotes } from "@/hooks/useStockQuotes"

export default function MarketsPage() {
  // const { assets, loading, error, refetch } = useStockQuotes()

  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <main className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-4">
          <h1
            className="text-5xl font-extrabold text-foreground"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            Coming Soon
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto" style={{ fontFamily: "Figtree, sans-serif" }}>
            The Markets page is under construction. Check back soon for tokenized asset trading.
          </p>
        </div>
      </main>

      {/* Original Markets page content — commented out
      <main className="pt-24 pb-16">
        <MarketTickerBar />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <AssetColumns assets={assets} loading={loading} />
          <ProductGrid assets={assets} loading={loading} error={error} onRefetch={refetch} />
        </div>
      </main>
      */}
    </div>
  )
}
