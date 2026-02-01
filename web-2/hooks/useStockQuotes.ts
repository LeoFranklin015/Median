"use client"

import { useState, useEffect } from "react"
import { ASSETS } from "@/lib/sparkline-data"
import type { AssetData } from "@/lib/sparkline-data"

type QuoteData = {
  c: number
  d: number
  dp: number
  h: number
  l: number
  o: number
  pc: number
  t?: number
}

function generateSparklineFromChange(
  currentPrice: number,
  changePercent: number,
  points = 24,
  seed = 0
): number[] {
  const data: number[] = []
  const totalChange = currentPrice * (changePercent / 100)
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const noise = Math.sin((i + seed) * 2.1) * 0.008 + Math.cos((i + seed) * 1.3) * 0.005
    const price = currentPrice - totalChange * (1 - t) + currentPrice * noise
    data.push(Math.max(price, 0.01))
  }
  return data
}

export type AssetWithQuote = AssetData & {
  price: number
  change24h: number
  change24hPercent: number
  sparklineData: number[]
  isLive: boolean
  high24h?: number
  low24h?: number
  open24h?: number
  lastUpdated?: Date
}

function mergeAssetWithQuote(
  asset: AssetData,
  quote: QuoteData | null
): AssetWithQuote {
  if (!quote || quote.c === 0) {
    return {
      ...asset,
      price: asset.price,
      change24h: asset.change24h,
      change24hPercent: asset.change24hPercent,
      sparklineData: asset.sparklineData,
      isLive: false,
    }
  }

  const change = quote.d ?? quote.c - quote.pc
  const changePercent = quote.dp ?? (quote.pc ? ((quote.c - quote.pc) / quote.pc) * 100 : 0)
  const sparkline = generateSparklineFromChange(
    quote.c,
    changePercent,
    24,
    parseInt(asset.id, 10)
  )

  return {
    ...asset,
    price: quote.c,
    change24h: change,
    change24hPercent: changePercent,
    sparklineData: sparkline,
    isLive: true,
    high24h: quote.h > 0 ? quote.h : undefined,
    low24h: quote.l > 0 ? quote.l : undefined,
    open24h: quote.o > 0 ? quote.o : undefined,
    lastUpdated: new Date(),
  }
}

export function useStockQuotes(): {
  assets: AssetWithQuote[]
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const [assets, setAssets] = useState<AssetWithQuote[]>(() =>
    ASSETS.map((a) => mergeAssetWithQuote(a, null))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotes = async (isRefetch = false) => {
    if (!isRefetch) setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/quotes")
      if (!res.ok) throw new Error("Failed to fetch quotes")
      const quotes: Record<string, QuoteData | null> = await res.json()
      setAssets(
        ASSETS.map((asset) =>
          mergeAssetWithQuote(asset, quotes[asset.ticker] ?? null)
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      setAssets(ASSETS.map((a) => mergeAssetWithQuote(a, null)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes(false)
    const interval = setInterval(() => fetchQuotes(true), 60000)
    return () => clearInterval(interval)
  }, [])

  return { assets, loading, error, refetch: () => fetchQuotes(false) }
}
