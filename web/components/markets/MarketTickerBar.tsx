"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Radio } from "lucide-react"
import { useStockQuotes, type AssetWithQuote } from "@/hooks/useStockQuotes"
import { cn } from "@/lib/utils"

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return price.toFixed(2)
}

function TickerItem({ asset }: { asset: AssetWithQuote }) {
  const isPositive = asset.change24hPercent >= 0

  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 min-w-[200px] cursor-default">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
          asset.iconBg
        )}
      >
        {asset.icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
          {asset.ticker}
        </span>
        <span className="text-xs text-zinc-500 truncate max-w-[100px]">
          {asset.name}
        </span>
      </div>
      <div className="flex flex-col items-end ml-auto">
        <span className="text-sm font-semibold text-zinc-900 tabular-nums">
          ${formatPrice(asset.price)}
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? "+" : ""}
          {asset.change24hPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

function TickerSkeleton() {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-zinc-200/80 min-w-[200px]">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 animate-pulse" />
      <div className="flex flex-col gap-1">
        <div className="w-12 h-4 bg-zinc-100 rounded animate-pulse" />
        <div className="w-16 h-3 bg-zinc-100 rounded animate-pulse" />
      </div>
      <div className="flex flex-col items-end ml-auto gap-1">
        <div className="w-16 h-4 bg-zinc-100 rounded animate-pulse" />
        <div className="w-12 h-3 bg-zinc-100 rounded animate-pulse" />
      </div>
    </div>
  )
}

export function MarketTickerBar() {
  const { assets, loading } = useStockQuotes()

  // Filter to only show assets with valid prices
  const validAssets = assets.filter((a) => a.price > 0)

  // Show loading state
  if (loading && validAssets.length === 0) {
    return (
      <div className="relative overflow-hidden border-b border-zinc-200/60 bg-zinc-50/50">
        <div className="flex gap-6 py-4 px-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TickerSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Don't render if no valid assets
  if (validAssets.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden border-b border-zinc-200/60 bg-zinc-50/50">
      {/* Live indicator */}
      {validAssets.some((a) => a.isLive) && (
        <div className="absolute top-2 right-4 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
          <Radio className="w-3 h-3 animate-pulse" />
          Live
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-zinc-50 via-zinc-50/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-zinc-50 via-zinc-50/90 to-transparent z-10 pointer-events-none" />

      {/* Scrolling ticker */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-6 py-4 animate-ticker"
        style={{ width: "max-content" }}
      >
        {/* Duplicate assets for seamless scrolling */}
        {[...validAssets, ...validAssets].map((asset, i) => (
          <TickerItem key={`${asset.id}-${i}`} asset={asset} />
        ))}
      </motion.div>
    </div>
  )
}
