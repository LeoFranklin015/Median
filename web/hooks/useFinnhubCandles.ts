"use client"

import { useState, useEffect } from "react"

export type FinnhubOHLC = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type Resolution =
  | "1"
  | "5"
  | "15"
  | "30"
  | "60"
  | "D"
  | "W"
  | "M"

function mapTimeframeToResolution(timeframe: string): { resolution: Resolution; count: number } {
  switch (timeframe) {
    case "1m":
      return { resolution: "1", count: 300 }
    case "5m":
      return { resolution: "5", count: 300 }
    case "15m":
      return { resolution: "15", count: 300 }
    case "1h":
      return { resolution: "60", count: 500 }
    case "4h":
      return { resolution: "60", count: 500 }
    case "D":
      return { resolution: "D", count: 365 }
    case "W":
      return { resolution: "W", count: 365 }
    case "M":
      return { resolution: "M", count: 365 }
    default:
      return { resolution: "D", count: 365 }
  }
}

export function useFinnhubCandles(
  ticker: string,
  timeframe: string,
  enabled: boolean
): {
  data: FinnhubOHLC[]
  loading: boolean
  error: string | null
} {
  const [data, setData] = useState<FinnhubOHLC[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !ticker) return

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { resolution, count } = mapTimeframeToResolution(timeframe)
        const params = new URLSearchParams({
          symbol: ticker,
          resolution,
          count: String(count),
        })
        const res = await fetch(`/api/stocks/candles?${params.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          throw new Error("Failed to fetch candles")
        }
        const json = await res.json()
        if (!json || json.s !== "ok" || !Array.isArray(json.t)) {
          throw new Error("No candle data")
        }
        const candles: FinnhubOHLC[] = json.t.map((t: number, i: number) => ({
          time: t,
          open: json.o[i],
          high: json.h[i],
          low: json.l[i],
          close: json.c[i],
          volume: json.v[i],
        }))
        if (!cancelled) {
          setData(candles)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load candle data")
          setData([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [ticker, timeframe, enabled])

  return { data, loading, error }
}

