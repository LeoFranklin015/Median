"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { BYBIT_WS_URL, BYBIT_REST_URL, tickerToBybitSymbol } from "@/lib/bybit"

const LOG_STREAM = true

function logStream(label: string, data: unknown) {
  if (typeof window !== "undefined" && LOG_STREAM) {
    // eslint-disable-next-line no-console
    console.log(`[Bybit Tickers] ${label}`, data)
  }
}

export type TickerData = {
  ticker: string
  symbol: string
  price: number
  change24h: number
  changePct24h: number
  high24h: number
  low24h: number
  volume24h: number
  turnover24h: number
  openInterest: number
  fundingRate: number
  nextFundingTime: number
  lastUpdated: number
}

type BybitTickerWsMessage = {
  topic?: string
  type?: string
  ts?: number
  data?: {
    symbol: string
    lastPrice: string
    price24hPcnt: string
    highPrice24h: string
    lowPrice24h: string
    volume24h: string
    turnover24h: string
    openInterest: string
    fundingRate: string
    nextFundingTime: string
  }
}

const SUPPORTED_TICKERS = [
  "BTC", "ETH", "SOL", "LINK", "SUI", "DOGE", "XRP",
  "AVAX", "ATOM", "ADA", "DOT", "LTC", "ARB", "OP",
  "PEPE", "WIF", "BONK", "SEI", "APT", "FIL", "NEAR", "INJ", "TIA"
]

export function useBybitTickers() {
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateTicker = useCallback((symbol: string, data: Partial<TickerData>) => {
    setTickers((prev) => {
      const next = new Map(prev)
      const existing = next.get(symbol) || {
        ticker: "",
        symbol,
        price: 0,
        change24h: 0,
        changePct24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        turnover24h: 0,
        openInterest: 0,
        fundingRate: 0,
        nextFundingTime: 0,
        lastUpdated: Date.now(),
      }
      next.set(symbol, { ...existing, ...data, lastUpdated: Date.now() })
      return next
    })
  }, [])

  // Fetch initial tickers from REST
  useEffect(() => {
    async function fetchTickers() {
      setLoading(true)
      setError(null)
      try {
        const url = new URL(`${BYBIT_REST_URL}/v5/market/tickers`)
        url.searchParams.set("category", "linear")
        const res = await fetch(url.toString(), { cache: "no-store" })
        const json = await res.json()

        if (json.retCode !== 0) {
          throw new Error(json.retMsg ?? "Bybit API error")
        }

        const list = json.result?.list ?? []
        const tickerMap = new Map<string, TickerData>()

        for (const item of list) {
          const symbol = item.symbol as string
          // Find matching ticker
          const ticker = SUPPORTED_TICKERS.find(
            (t) => tickerToBybitSymbol(t) === symbol
          )
          if (!ticker) continue

          const price = Number(item.lastPrice)
          const prevPrice = Number(item.prevPrice24h) || price
          const change24h = price - prevPrice

          tickerMap.set(symbol, {
            ticker,
            symbol,
            price,
            change24h,
            changePct24h: Number(item.price24hPcnt) * 100,
            high24h: Number(item.highPrice24h),
            low24h: Number(item.lowPrice24h),
            volume24h: Number(item.volume24h),
            turnover24h: Number(item.turnover24h),
            openInterest: Number(item.openInterest),
            fundingRate: Number(item.fundingRate) * 100,
            nextFundingTime: Number(item.nextFundingTime),
            lastUpdated: Date.now(),
          })
        }

        setTickers(tickerMap)
        logStream("Loaded tickers", tickerMap.size)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch tickers")
      } finally {
        setLoading(false)
      }
    }

    fetchTickers()
  }, [])

  // Subscribe to WebSocket for live updates
  useEffect(() => {
    const symbols = SUPPORTED_TICKERS.map(tickerToBybitSymbol).filter(Boolean) as string[]
    if (symbols.length === 0) return

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      const ws = new WebSocket(BYBIT_WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        logStream("Connected", { url: BYBIT_WS_URL })
        // Subscribe to tickers for all symbols
        const topics = symbols.map((s) => `tickers.${s}`)
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: topics,
          })
        )
        logStream("Subscribed to tickers", topics.length)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as BybitTickerWsMessage

          if (msg.topic?.startsWith("tickers.") && msg.data) {
            const d = msg.data
            const symbol = d.symbol
            const ticker = SUPPORTED_TICKERS.find(
              (t) => tickerToBybitSymbol(t) === symbol
            )
            if (!ticker) return

            const price = Number(d.lastPrice)
            updateTicker(symbol, {
              ticker,
              price,
              changePct24h: Number(d.price24hPcnt) * 100,
              high24h: Number(d.highPrice24h),
              low24h: Number(d.lowPrice24h),
              volume24h: Number(d.volume24h),
              turnover24h: Number(d.turnover24h),
              openInterest: Number(d.openInterest),
              fundingRate: Number(d.fundingRate) * 100,
              nextFundingTime: Number(d.nextFundingTime),
            })
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = (e) => {
        logStream("Error", e)
      }

      ws.onclose = () => {
        wsRef.current = null
        logStream("Closed", null)
        if (!cancelled) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }
    }

    let cancelled = false
    connect()

    return () => {
      cancelled = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [updateTicker])

  // Convert map to array sorted by volume
  const tickersList = Array.from(tickers.values()).sort(
    (a, b) => b.turnover24h - a.turnover24h
  )

  return {
    tickers,
    tickersList,
    loading,
    error,
    getTickerBySymbol: (symbol: string) => tickers.get(symbol),
    getTickerByTicker: (ticker: string) => {
      const symbol = tickerToBybitSymbol(ticker)
      return symbol ? tickers.get(symbol) : undefined
    },
  }
}
