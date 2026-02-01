"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Sparkline } from "./Sparkline"
import { cn } from "@/lib/utils"

import type { AssetData } from "@/lib/sparkline-data"

export type AssetCardProps = AssetData

export function AssetCard({
  asset,
  variant = "grid",
  index = 0,
}: {
  asset: AssetData & { price: number; change24h: number; change24hPercent: number; sparklineData: number[] }
  variant?: "grid" | "list"
  index?: number
}) {
  const positive = asset.change24h >= 0

  return (
    <Link href={`/markets/assets/${asset.ticker}`}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className={cn(
        "group relative rounded-2xl bg-white border border-zinc-200/80 p-5 shadow-sm hover:shadow-lg hover:border-zinc-300/80 transition-all duration-300 overflow-hidden block cursor-pointer",
        variant === "list" && "flex flex-row items-center gap-6"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          variant === "list" && "flex-row flex-1 items-center"
        )}
      >
        {/* Top: Icon, Ticker, Name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0",
                asset.iconBg
              )}
            >
              {asset.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {asset.ticker}
              </p>
              <p className="text-xs text-zinc-500 truncate">{asset.name}</p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-bold text-zinc-900 tracking-tight">
            ${asset.price.toFixed(2)}
          </p>
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              positive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {positive ? (
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 flex-shrink-0" />
            )}
            <span>
              {positive ? "+" : ""}${Math.abs(asset.change24h).toFixed(2)} (
              {positive ? "+" : ""}
              {asset.change24hPercent.toFixed(2)}%)
            </span>
            <span className="text-zinc-400 font-normal">24H</span>
          </div>
        </div>

        {/* Sparkline */}
        <div
          className={cn(
            "w-full",
            variant === "grid" ? "h-16" : "h-12 w-32 flex-shrink-0"
          )}
        >
          <Sparkline
            data={asset.sparklineData}
            width={variant === "grid" ? 240 : 128}
            height={variant === "grid" ? 64 : 48}
            positive={positive}
          />
        </div>
      </div>
    </motion.div>
    </Link>
  )
}
