"use client"

/**
 * Professional candlestick chart with zoom, pan, crosshair, volume.
 * Pass real API data via the `data` prop when ready.
 * Expected format: { time, open, high, low, close, volume? }
 * - time: Unix timestamp (seconds) or "YYYY-MM-DD" string
 */
import { useEffect, useRef, useCallback } from "react"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts"
import { cn } from "@/lib/utils"

export type OHLCData = {
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/** Generate mock OHLC candlestick data - ready to swap with real API data */
export function generateMockCandleData(
  basePrice: number,
  count: number = 100,
  seed: number = 0
): OHLCData[] {
  const data: OHLCData[] = []
  let price = basePrice
  const now = new Date()

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setMinutes(date.getMinutes() - i * 15)
    const time = Math.floor(date.getTime() / 1000) as number

    const volatility = basePrice * 0.02
    const change = (Math.sin((i + seed) * 0.5) * 0.5 + Math.cos((i + seed) * 0.3) * 0.3) * volatility
    const open = price
    price = price + change
    const close = price
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    const volume = Math.floor(1000000 + Math.random() * 5000000)

    data.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })
  }

  return data
}

/** Convert OHLCData to lightweight-charts format */
function toChartFormat(data: OHLCData[]) {
  return data.map((d) => ({
    time: d.time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }))
}

type CandlestickChartProps = {
  data?: OHLCData[]
  basePrice?: number
  height?: number
  className?: string
  isDark?: boolean
}

export function CandlestickChartComponent({
  data: propData,
  basePrice = 100,
  height = 400,
  className,
  isDark = true,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)

  const data = propData ?? generateMockCandleData(basePrice, 100)

  const initChart = useCallback(() => {
    if (!containerRef.current || data.length === 0) return

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          width: 1,
          style: 2,
          labelBackgroundColor: isDark ? "#1e1e1e" : "#f4f4f5",
        },
        horzLine: {
          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          width: 1,
          style: 2,
          labelBackgroundColor: isDark ? "#1e1e1e" : "#f4f4f5",
        },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
        borderVisible: true,
      },
      timeScale: {
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        timeVisible: true,
        secondsVisible: false,
        rightBarSpacing: 12,
        barSpacing: 6,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
        pinchMaxItems: 10,
      },
    })

    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    })

    candleSeriesRef.current = candleSeries
    candleSeries.setData(toChartFormat(data))

    if (data.some((d) => d.volume)) {
      const volumeData = data.map((d) => ({
        time: d.time,
        value: d.volume ?? 0,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }))

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#26a69a",
        priceFormat: { type: "volume" },
        priceScaleId: "",
      })

      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
        borderVisible: false,
      })

      volumeSeriesRef.current = volumeSeries
      volumeSeries.setData(volumeData)
    }

    chart.timeScale().fitContent()

    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [data, isDark])

  useEffect(() => {
    const cleanup = initChart()
    return () => cleanup?.()
  }, [initChart])

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("w-full", className)}
      style={{ height }}
    />
  )
}
