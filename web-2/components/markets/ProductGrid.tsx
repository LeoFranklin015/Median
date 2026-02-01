"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, LayoutGrid, List, ChevronDown } from "lucide-react"
import { AssetCard } from "./AssetCard"
import type { AssetWithQuote } from "@/hooks/useStockQuotes"
import { cn } from "@/lib/utils"

const FILTER_OPTIONS = [
  "All assets",
  "ETF",
  "Technology",
  "Consumer",
  "Financials",
  "Large Cap",
  "Growth",
  "Value",
]

const SORT_OPTIONS = [
  { value: "most-popular", label: "Most Popular" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "change-desc", label: "Top Gainers" },
  { value: "change-asc", label: "Top Losers" },
]

type ProductGridProps = {
  assets: AssetWithQuote[]
  loading?: boolean
  error?: string | null
}

export function ProductGrid({ assets, loading, error }: ProductGridProps) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("most-popular")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [sortOpen, setSortOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("All assets")

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.ticker.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      activeFilter === "All assets" || asset.categories.includes(activeFilter)
    return matchesSearch && matchesFilter
  })

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sort) {
      case "price-desc":
        return b.price - a.price
      case "price-asc":
        return a.price - b.price
      case "change-desc":
        return b.change24hPercent - a.change24hPercent
      case "change-asc":
        return a.change24hPercent - b.change24hPercent
      default:
        return 0
    }
  })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight mb-2">
          Explore Assets
        </h1>
      </motion.div>

      {/* Search + Filter Pills */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search asset name or ticker"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100/80 border border-zinc-200/80 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-300 transition-all duration-200"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  activeFilter === filter
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* View + Sort */}
        <div className="flex items-center justify-end gap-2">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "p-2.5 transition-all duration-200",
                view === "grid"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "p-2.5 transition-all duration-200",
                view === "list"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-all duration-200"
            >
              {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort"}
              <ChevronDown
                className={cn("w-4 h-4 transition-transform duration-200", sortOpen && "rotate-180")}
              />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10"
                    onClick={() => setSortOpen(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-1 py-1 w-48 rounded-xl bg-white border border-zinc-200 shadow-lg z-20"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSort(opt.value)
                          setSortOpen(false)
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm transition-colors",
                          sort === opt.value
                            ? "text-zinc-900 bg-zinc-100 font-medium"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Asset Grid / List */}
      <AnimatePresence mode="wait">
        {error && (
          <p className="text-sm text-amber-600 mb-4">
            {error} Showing cached data.
          </p>
        )}
        {loading && sortedAssets.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-zinc-100 animate-pulse"
              />
            ))}
          </div>
        ) : sortedAssets.length > 0 ? (
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "gap-6",
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col"
            )}
          >
            {sortedAssets.map((asset, index) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                variant={view}
                index={index}
              />
            ))}
          </motion.div>
        ) : !loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-zinc-500">No assets match your search.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
