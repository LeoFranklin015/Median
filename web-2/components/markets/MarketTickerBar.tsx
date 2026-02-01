"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { MARKET_INDICES } from "@/lib/market-indices"
import { cn } from "@/lib/utils"

function formatValue(value: number, name: string): string {
  if (name.includes("Yield") || name.includes("Volatility")) return value.toFixed(2)
  if (value >= 1000) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return value.toFixed(2)
}

function TickerItem({ index }: { index: (typeof MARKET_INDICES)[0] }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 min-w-[220px] cursor-default">
      <span className="text-sm font-medium text-zinc-900 whitespace-nowrap">
        {index.name}
      </span>
      <span className="text-sm font-semibold text-zinc-900 tabular-nums">
        {formatValue(index.value, index.name)}
      </span>
      <span
        className={cn(
          "flex items-center gap-0.5 text-xs font-medium",
          index.change24hPercent >= 0 ? "text-emerald-600" : "text-red-600"
        )}
      >
        {index.change24hPercent >= 0 ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
        {index.change24hPercent >= 0 ? "+" : ""}
        {index.change24hPercent.toFixed(2)}%
      </span>
    </div>
  )
}

export function MarketTickerBar() {
  return (
    <div className="relative overflow-hidden border-b border-zinc-200/60 bg-zinc-50/50">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-zinc-50 via-zinc-50/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-zinc-50 via-zinc-50/90 to-transparent z-10 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-6 py-4 animate-ticker"
        style={{ width: "max-content" }}
      >
        {[...MARKET_INDICES, ...MARKET_INDICES].map((index, i) => (
          <TickerItem key={`${index.id}-${i}`} index={index} />
        ))}
      </motion.div>
    </div>
  )
}
