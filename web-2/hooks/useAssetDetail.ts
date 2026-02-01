"use client"

import { useState, useEffect } from "react"
import type { AssetData } from "@/lib/sparkline-data"

export type AssetDetailData = AssetData & {
  price: number
  change24h: number
  change24hPercent: number
  sparklineData: number[]
  chartData: { time: number; value: number }[]
  candlesData: { o: number[]; h: number[]; l: number[]; c: number[]; t: number[] } | null
  isLoading: boolean
}

export function useAssetDetail(asset: AssetData) {
  const [data, setData] = useState<AssetDetailData>({
    ...asset,
    price: asset.price,
    change24h: asset.change24h,
    change24hPercent: asset.change24hPercent,
    sparklineData: asset.sparklineData,
    chartData: asset.sparklineData.map((v, i) => ({ time: i, value: v })),
    candlesData: null,
    isLoading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [quoteRes, candlesRes] = await Promise.all([
          fetch(`/api/stocks/quotes?symbols=${asset.ticker}`),
          fetch(`/api/stocks/candles?symbol=${asset.ticker}&resolution=D&count=90`),
        ])

        if (cancelled) return

        const quoteData = await quoteRes.json()
        const quote = quoteData[asset.ticker]
        const candles = candlesRes.ok ? await candlesRes.json() : null

        if (cancelled) return

        const updates: Partial<AssetDetailData> = { isLoading: false }

        if (quote && quote.c > 0) {
          const change = quote.d ?? quote.c - quote.pc
          const changePercent = quote.dp ?? (quote.pc ? ((quote.c - quote.pc) / quote.pc) * 100 : 0)
          updates.price = quote.c
          updates.change24h = change
          updates.change24hPercent = changePercent
          updates.sparklineData = generateSparkline(quote.c, changePercent)
        }

        if (candles?.c?.length) {
          updates.chartData = candles.c.map((v: number, i: number) => ({
            time: candles.t?.[i] ?? i,
            value: v,
          }))
          updates.candlesData = candles
        }

        setData((prev) => ({ ...prev, ...updates }))
      } catch {
        if (!cancelled) {
          setData((prev) => ({ ...prev, isLoading: false }))
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [asset.ticker, asset.id])

  return data
}

function generateSparkline(currentPrice: number, changePercent: number, points = 24): number[] {
  const data: number[] = []
  const totalChange = currentPrice * (changePercent / 100)
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const noise = Math.sin(i * 2.1) * 0.008 + Math.cos(i * 1.3) * 0.005
    const price = currentPrice - totalChange * (1 - t) + currentPrice * noise
    data.push(Math.max(price, 0.01))
  }
  return data
}
