"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { ASSETS } from "@/lib/sparkline-data"
import { cn } from "@/lib/utils"

const topGainers = [...ASSETS]
  .filter((a) => a.change24hPercent > 0)
  .sort((a, b) => b.change24hPercent - a.change24hPercent)
  .slice(0, 5)

const trending = [ASSETS[0], ASSETS[1], ASSETS[6], ASSETS[7], ASSETS[8]] // SLV, NVDA, AAPL, SPY, TSLA - high visibility

const newlyAdded = ASSETS.filter((a) => a.addedDate).slice(0, 5)

function ColumnItem({
  asset,
  type,
}: {
  asset: (typeof ASSETS)[0]
  type: "gainers" | "trending" | "newlyAdded"
}) {
  const positive = asset.change24h >= 0

  return (
    <Link href={`/markets/assets/${asset.ticker}`}>
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 border border-transparent hover:border-zinc-200/80 transition-all duration-200 cursor-pointer group"
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
          asset.iconBg
        )}
      >
        {asset.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 truncate">
          {asset.ticker}
        </p>
        <p className="text-xs text-zinc-500 truncate">{asset.name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-zinc-900">
          ${asset.price.toFixed(2)}
        </p>
        {type === "gainers" && (
          <p
            className={cn(
              "flex items-center justify-end gap-0.5 text-xs font-medium",
              positive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {positive ? "+" : ""}
            {asset.change24hPercent.toFixed(2)}%
          </p>
        )}
        {type === "trending" && asset.marketCap && (
          <p className="text-xs text-zinc-500">{asset.marketCap}</p>
        )}
        {type === "newlyAdded" && (
          <p className="text-xs text-zinc-500">
            {asset.addedDate ?? `${asset.category} Stock`}
          </p>
        )}
      </div>
    </motion.div>
    </Link>
  )
}

function Column({
  title,
  items,
  type,
  delay = 0,
}: {
  title: string
  items: (typeof ASSETS)[0][]
  type: "gainers" | "trending" | "newlyAdded"
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex-1 min-w-0 rounded-2xl bg-white border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <span className="text-xs text-zinc-400 font-medium">24H</span>
      </div>
      <div className="space-y-1">
        {items.map((asset) => (
          <ColumnItem key={asset.id} asset={asset} type={type} />
        ))}
      </div>
    </motion.div>
  )
}

export function AssetColumns() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <Column
        title="Top Gainers"
        items={topGainers}
        type="gainers"
        delay={0.1}
      />
      <Column
        title="Trending"
        items={trending}
        type="trending"
        delay={0.15}
      />
      <Column
        title="Newly Added"
        items={newlyAdded}
        type="newlyAdded"
        delay={0.2}
      />
    </div>
  )
}
