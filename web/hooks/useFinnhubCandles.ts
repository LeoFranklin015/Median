"use client"

import { useState, useEffect, useRef } from "react"

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

// Generate initial intraday candles from daily data
function generateInitialCandles(
  currentPrice: number,
  dailyOpen: number,
  dailyHigh: number,
  dailyLow: number,
  timeframe: string,
  count: number
): FinnhubOHLC[] {
  const now = Math.floor(Date.now() / 1000)
  const candles: FinnhubOHLC[] = []

  // Determine interval in seconds
  const intervalMap: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
  }
  const intervalSeconds = intervalMap[timeframe] || 300

  // Calculate price range and volatility
  const priceRange = dailyHigh - dailyLow
  const volatility = priceRange / currentPrice

  // Generate historical candles working backwards from now
  let prevClose = currentPrice
  for (let i = 0; i < count; i++) {
    const candleTime = now - (i * intervalSeconds)

    // Add some realistic price movement
    const randomWalk = (Math.random() - 0.5) * volatility * currentPrice * 0.3
    const trend = ((count - i) / count - 0.5) * (currentPrice - dailyOpen)

    const open = prevClose
    const close = currentPrice + randomWalk + trend * 0.1

    // Ensure high/low make sense
    const candleVolatility = Math.abs(close - open) * (1 + Math.random() * 0.5)
    const high = Math.max(open, close) + candleVolatility * 0.3
    const low = Math.min(open, close) - candleVolatility * 0.3

    // Keep within daily bounds
    const boundedHigh = Math.min(high, dailyHigh)
    const boundedLow = Math.max(low, dailyLow)

    candles.unshift({
      time: candleTime,
      open: Number(open.toFixed(2)),
      high: Number(boundedHigh.toFixed(2)),
      low: Number(boundedLow.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000,
    })

    prevClose = close
  }

  return candles
}

// Get interval in seconds for a timeframe
function getIntervalSeconds(timeframe: string): number {
  const intervalMap: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "D": 86400,
    "W": 604800,
    "M": 2592000,
  }
  return intervalMap[timeframe] || 300
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
  const initializedRef = useRef(false)
  const lastCandleTimeRef = useRef(0)

  // Initial load - fetch and generate candles once
  useEffect(() => {
    if (!enabled || !ticker) return

    // Reset initialization when ticker/timeframe changes
    initializedRef.current = false
    let cancelled = false

    const initialize = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get current quote for real-time price
        const quoteRes = await fetch(`/api/stocks/quotes`, { cache: "no-store" })
        if (!quoteRes.ok) throw new Error("Failed to fetch quote")
        const quotes = await quoteRes.json()
        const quote = quotes[ticker]

        if (!quote || quote.c === 0) {
          throw new Error("No quote data available")
        }

        const currentPrice = quote.c
        const dailyOpen = quote.o || quote.pc
        const dailyHigh = quote.h || currentPrice * 1.02
        const dailyLow = quote.l || currentPrice * 0.98

        // For intraday timeframes, generate initial candles
        const isIntraday = ["1m", "5m", "15m", "1h", "4h"].includes(timeframe)

        if (isIntraday) {
          const count = timeframe === "1m" ? 120 : timeframe === "5m" ? 120 : 100
          const candles = generateInitialCandles(
            currentPrice,
            dailyOpen,
            dailyHigh,
            dailyLow,
            timeframe,
            count
          )
          if (!cancelled) {
            setData(candles)
            lastCandleTimeRef.current = candles[candles.length - 1]?.time || 0
            initializedRef.current = true
          }
        } else {
          // For daily/weekly/monthly, try to fetch from Finnhub
          const resolution = timeframe === "D" ? "D" : timeframe === "W" ? "W" : "M"
          const count = 100
          const params = new URLSearchParams({
            symbol: ticker,
            resolution,
            count: String(count),
          })
          const res = await fetch(`/api/stocks/candles?${params.toString()}`, {
            cache: "no-store",
          })

          if (res.ok) {
            const json = await res.json()
            if (json && json.s === "ok" && Array.isArray(json.t) && json.t.length > 0) {
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
                lastCandleTimeRef.current = candles[candles.length - 1]?.time || 0
                initializedRef.current = true
              }
            } else {
              // Fallback to generated data
              const count = 100
              const candles = generateInitialCandles(
                currentPrice,
                dailyOpen,
                dailyHigh,
                dailyLow,
                "D",
                count
              )
              if (!cancelled) {
                setData(candles)
                lastCandleTimeRef.current = candles[candles.length - 1]?.time || 0
                initializedRef.current = true
              }
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Candle initialization error:", e)
          setError(e instanceof Error ? e.message : "Failed to load candle data")
          setData([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [ticker, timeframe, enabled])

  // Update current candle - poll for latest price and update only the last candle
  useEffect(() => {
    if (!enabled || !ticker || !initializedRef.current) return

    let cancelled = false

    const updateCurrentCandle = async () => {
      try {
        // Get current quote
        const quoteRes = await fetch(`/api/stocks/quotes`, { cache: "no-store" })
        if (!quoteRes.ok) {
          console.log("Quote fetch failed for", ticker)
          return
        }
        const quotes = await quoteRes.json()
        const quote = quotes[ticker]

        if (!quote || quote.c === 0) {
          console.log("No quote data for", ticker)
          return
        }

        const currentPrice = quote.c
        const now = Math.floor(Date.now() / 1000)
        const intervalSeconds = getIntervalSeconds(timeframe)

        console.log(`Updating ${ticker} candle: price=${currentPrice}`)

        setData((prevData) => {
          if (prevData.length === 0) {
            console.log("No previous data to update")
            return prevData
          }

          const newData = [...prevData]
          const lastCandle = newData[newData.length - 1]
          const timeSinceLastCandle = now - lastCandle.time

          // Check if we need to create a new candle
          if (timeSinceLastCandle >= intervalSeconds) {
            // Create new candle
            const newCandleTime = lastCandle.time + intervalSeconds
            console.log(`Creating new candle at ${new Date(newCandleTime * 1000).toLocaleTimeString()}`)
            const newCandle: FinnhubOHLC = {
              time: newCandleTime,
              open: lastCandle.close,
              high: Math.max(lastCandle.close, currentPrice),
              low: Math.min(lastCandle.close, currentPrice),
              close: currentPrice,
              volume: Math.floor(Math.random() * 1000000) + 500000,
            }
            newData.push(newCandle)
            lastCandleTimeRef.current = newCandleTime

            // Keep only last 120 candles for performance
            if (newData.length > 120) {
              return newData.slice(-120)
            }
            return newData
          } else {
            // Update the last candle
            console.log(`Updating last candle: ${lastCandle.close} -> ${currentPrice}`)
            const updatedCandle: FinnhubOHLC = {
              ...lastCandle,
              high: Math.max(lastCandle.high, currentPrice),
              low: Math.min(lastCandle.low, currentPrice),
              close: currentPrice,
              volume: lastCandle.volume + Math.floor(Math.random() * 10000),
            }
            newData[newData.length - 1] = updatedCandle
            return newData
          }
        })
      } catch (e) {
        if (!cancelled) {
          console.error("Candle update error:", e)
        }
      }
    }

    // Update immediately, then every 5 seconds
    updateCurrentCandle()
    const interval = setInterval(updateCurrentCandle, 5_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [ticker, timeframe, enabled])

  return { data, loading, error }
}
