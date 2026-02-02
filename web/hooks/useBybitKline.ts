"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  fetchBybitKlines,
  tickerToBybitSymbol,
  timeframeToBybitInterval,
  BYBIT_WS_URL,
  type OHLCData,
} from "@/lib/bybit"

/** Log stream data to console (enable in dev) */
const LOG_STREAM = true

function logStream(label: string, data: unknown) {
  if (typeof window !== "undefined" && LOG_STREAM) {
    // eslint-disable-next-line no-console
    console.log(`[Bybit WS] ${label}`, data)
  }
}

type BybitKlineWsMessage = {
  topic?: string
  type?: string
  ts?: number
  data?: Array<{
    start: number
    end: number
    interval: string
    open: string
    close: string
    high: string
    low: string
    volume: string
    turnover: string
    confirm: boolean
    timestamp: number
  }>
}

function wsCandleToOHLC(d: {
  start: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}): OHLCData {
  return {
    time: Math.floor(d.start / 1000),
    open: Number(d.open),
    high: Number(d.high),
    low: Number(d.low),
    close: Number(d.close),
    volume: Number(d.volume),
  }
}

export function useBybitKline(ticker: string, timeframe: string) {
  const symbol = tickerToBybitSymbol(ticker)
  const interval = timeframeToBybitInterval(timeframe)
  const isSupported = !!symbol

  const [data, setData] = useState<OHLCData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mergeCandle = useCallback((candle: OHLCData) => {
    setData((prev) => {
      const idx = prev.findIndex((c) => c.time === candle.time)
      let next: OHLCData[]
      if (idx >= 0) {
        next = [...prev]
        next[idx] = candle
      } else {
        next = [...prev, candle]
        next.sort((a, b) => a.time - b.time)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!isSupported) {
      setData([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function loadInitial() {
      setLoading(true)
      setError(null)
      try {
        const candles = await fetchBybitKlines(symbol!, interval, 200)
        if (!cancelled) {
          setData(candles)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch klines")
          setData([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [symbol, interval, isSupported])

  useEffect(() => {
    if (!isSupported || !symbol) return

    const topic = `kline.${interval}.${symbol}`

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      const ws = new WebSocket(BYBIT_WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        logStream("Connected", { url: BYBIT_WS_URL })
        ws.send(
          JSON.stringify({
            op: "subscribe",
            args: [topic],
          })
        )
        logStream("Subscribed", { topic })
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as BybitKlineWsMessage
          logStream("Message", msg)

          if (msg.topic === topic && msg.data?.length) {
            const candle = wsCandleToOHLC(msg.data[0])
            logStream("Candle update", candle)
            mergeCandle(candle)
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
        logStream("Closed", { topic })
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
  }, [symbol, interval, isSupported, mergeCandle])

  return {
    data,
    loading,
    error,
    isSupported,
    symbol: symbol ?? undefined,
  }
}
