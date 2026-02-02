"use client"

/**
 * Professional candlestick chart with zoom, pan, crosshair, volume.
 * Supports live updates via update() when data changes incrementally.
 * dataKey: reset chart when symbol/interval changes
 * chartType: candlestick | hollow | bar | line | area
 */
import { useEffect, useRef, useCallback } from "react"
import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts"
import { cn } from "@/lib/utils"

export type ChartType = "candlestick" | "hollow" | "bar" | "line" | "area"

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

/** Convert OHLCData to lightweight-charts format. time must be number (Unix seconds). */
function toChartFormat(data: OHLCData[]) {
  return data.map((d) => ({
    time: (typeof d.time === "number" ? d.time : Math.floor(Number(d.time))) as import("lightweight-charts").UTCTimestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }))
}

export type IndicatorType = "SMA" | "EMA" | "BB" | "RSI" | "MACD" | "VOL"

type CandlestickChartProps = {
  data?: OHLCData[]
  dataKey?: string
  basePrice?: number
  height?: number
  className?: string
  isDark?: boolean
  chartType?: ChartType
  indicators?: IndicatorType[]
}

// Calculate Simple Moving Average
function calculateSMA(data: OHLCData[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    result.push({
      time: typeof data[i].time === "number" ? data[i].time : Math.floor(Number(data[i].time)),
      value: sum / period,
    })
  }
  return result
}

// Calculate Exponential Moving Average
function calculateEMA(data: OHLCData[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = []
  const multiplier = 2 / (period + 1)
  
  // First EMA is SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].close
  }
  let ema = sum / period
  result.push({
    time: typeof data[period - 1].time === "number" ? data[period - 1].time : Math.floor(Number(data[period - 1].time)),
    value: ema,
  })
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema
    result.push({
      time: typeof data[i].time === "number" ? data[i].time : Math.floor(Number(data[i].time)),
      value: ema,
    })
  }
  return result
}

// Calculate Bollinger Bands
function calculateBB(data: OHLCData[], period: number, stdDev: number = 2): { 
  upper: { time: number; value: number }[]
  middle: { time: number; value: number }[]
  lower: { time: number; value: number }[] 
} {
  const upper: { time: number; value: number }[] = []
  const middle: { time: number; value: number }[] = []
  const lower: { time: number; value: number }[] = []
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    const sma = sum / period
    
    let sumSquares = 0
    for (let j = 0; j < period; j++) {
      sumSquares += Math.pow(data[i - j].close - sma, 2)
    }
    const std = Math.sqrt(sumSquares / period)
    
    const time = typeof data[i].time === "number" ? data[i].time : Math.floor(Number(data[i].time))
    upper.push({ time, value: sma + stdDev * std })
    middle.push({ time, value: sma })
    lower.push({ time, value: sma - stdDev * std })
  }
  
  return { upper, middle, lower }
}

export function CandlestickChartComponent({
  data: propData,
  dataKey = "default",
  basePrice = 100,
  height = 400,
  className,
  isDark = true,
  chartType = "candlestick",
  indicators = [],
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const lastDataKeyRef = useRef<string>("")
  const lastIndicatorsRef = useRef<string>("")
  const data = propData ?? generateMockCandleData(basePrice, 100)

  const createChartInstance = useCallback(() => {
    if (!containerRef.current) return null

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

    // Create main series based on chart type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mainSeries: ISeriesApi<any>

    switch (chartType) {
      case "candlestick":
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#22c55e",
          wickDownColor: "#ef4444",
          wickUpColor: "#22c55e",
        })
        break
      case "hollow":
        // Hollow candles: outline only for up candles
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: "transparent",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#22c55e",
          wickDownColor: "#ef4444",
          wickUpColor: "#22c55e",
        })
        break
      case "bar":
        mainSeries = chart.addSeries(BarSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          thinBars: false,
        })
        break
      case "line":
        mainSeries = chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
        })
        break
      case "area":
        mainSeries = chart.addSeries(AreaSeries, {
          topColor: "rgba(59, 130, 246, 0.4)",
          bottomColor: "rgba(59, 130, 246, 0.05)",
          lineColor: "#3b82f6",
          lineWidth: 2,
        })
        break
      default:
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#22c55e",
          wickDownColor: "#ef4444",
          wickUpColor: "#22c55e",
        })
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderVisible: false,
    })

    chartRef.current = chart
    mainSeriesRef.current = mainSeries
    volumeSeriesRef.current = volumeSeries
    return { chart, mainSeries, volumeSeries }
  }, [isDark, chartType])

  // Update indicators on the chart
  const updateIndicators = useCallback((chart: IChartApi, data: OHLCData[], activeIndicators: IndicatorType[]) => {
    // Remove old indicator series that are no longer active
    indicatorSeriesRef.current.forEach((series, key) => {
      if (!activeIndicators.some(ind => key.startsWith(ind))) {
        chart.removeSeries(series)
        indicatorSeriesRef.current.delete(key)
      }
    })

    // Add/update indicator series
    activeIndicators.forEach((indicator) => {
      switch (indicator) {
        case "SMA": {
          const smaKey = "SMA-20"
          if (!indicatorSeriesRef.current.has(smaKey)) {
            const smaSeries = chart.addSeries(LineSeries, {
              color: "#3b82f6",
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            })
            indicatorSeriesRef.current.set(smaKey, smaSeries)
          }
          const smaData = calculateSMA(data, 20)
          indicatorSeriesRef.current.get(smaKey)?.setData(
            smaData.map(d => ({ ...d, time: d.time as import("lightweight-charts").UTCTimestamp }))
          )
          break
        }
        case "EMA": {
          const emaKey = "EMA-20"
          if (!indicatorSeriesRef.current.has(emaKey)) {
            const emaSeries = chart.addSeries(LineSeries, {
              color: "#8b5cf6",
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            })
            indicatorSeriesRef.current.set(emaKey, emaSeries)
          }
          const emaData = calculateEMA(data, 20)
          indicatorSeriesRef.current.get(emaKey)?.setData(
            emaData.map(d => ({ ...d, time: d.time as import("lightweight-charts").UTCTimestamp }))
          )
          break
        }
        case "BB": {
          const bbUpperKey = "BB-upper"
          const bbMiddleKey = "BB-middle"
          const bbLowerKey = "BB-lower"
          
          if (!indicatorSeriesRef.current.has(bbUpperKey)) {
            const bbUpper = chart.addSeries(LineSeries, {
              color: "#f59e0b",
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            })
            const bbMiddle = chart.addSeries(LineSeries, {
              color: "#f59e0b",
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            })
            const bbLower = chart.addSeries(LineSeries, {
              color: "#f59e0b",
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            })
            indicatorSeriesRef.current.set(bbUpperKey, bbUpper)
            indicatorSeriesRef.current.set(bbMiddleKey, bbMiddle)
            indicatorSeriesRef.current.set(bbLowerKey, bbLower)
          }
          
          const bbData = calculateBB(data, 20)
          indicatorSeriesRef.current.get(bbUpperKey)?.setData(
            bbData.upper.map(d => ({ ...d, time: d.time as import("lightweight-charts").UTCTimestamp }))
          )
          indicatorSeriesRef.current.get(bbMiddleKey)?.setData(
            bbData.middle.map(d => ({ ...d, time: d.time as import("lightweight-charts").UTCTimestamp }))
          )
          indicatorSeriesRef.current.get(bbLowerKey)?.setData(
            bbData.lower.map(d => ({ ...d, time: d.time as import("lightweight-charts").UTCTimestamp }))
          )
          break
        }
        case "VOL": {
          // Volume is already shown by default, just ensure it's visible
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.applyOptions({ visible: true })
          }
          break
        }
        // RSI and MACD would need separate panes which lightweight-charts doesn't support easily
        // For now, skip them or show a simple line
        case "RSI":
        case "MACD":
          // These indicators typically need a separate pane
          // For simplicity, we'll skip them for now
          break
      }
    })

    // Hide volume if not in active indicators
    if (!activeIndicators.includes("VOL") && volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: false })
    }
  }, [])

  // Convert data to line/area format (just time and value/close price)
  const toLineFormat = useCallback((data: OHLCData[]) => {
    return data.map((d) => ({
      time: (typeof d.time === "number" ? d.time : Math.floor(Number(d.time))) as import("lightweight-charts").UTCTimestamp,
      value: d.close,
    }))
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const keyChanged = lastDataKeyRef.current !== dataKey
    const indicatorsKey = indicators.sort().join(",")
    const indicatorsChanged = lastIndicatorsRef.current !== indicatorsKey
    
    if (keyChanged) {
      lastDataKeyRef.current = dataKey
      indicatorSeriesRef.current.clear()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        mainSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }
    
    lastIndicatorsRef.current = indicatorsKey

    if (data.length === 0) return

    const mainSeries = mainSeriesRef.current
    const volumeSeries = volumeSeriesRef.current

    if (keyChanged || !mainSeries) {
      const created = createChartInstance()
      if (!created) return
      const { chart, mainSeries: ms, volumeSeries: vs } = created
      
      // Set data based on chart type
      if (chartType === "line" || chartType === "area") {
        const lineFmt = toLineFormat(data)
        ms.setData(lineFmt)
      } else {
        const candleFmt = toChartFormat(data)
        ms.setData(candleFmt)
      }
      
      const volData = data.map((d) => ({
        time: (typeof d.time === "number" ? d.time : Math.floor(Number(d.time))) as import("lightweight-charts").UTCTimestamp,
        value: d.volume ?? 0,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }))
      vs.setData(volData)
      
      // Update indicators
      updateIndicators(chart, data, indicators)
      
      chart.timeScale().fitContent()
    } else {
      // Update existing series
      if (chartType === "line" || chartType === "area") {
        const lineFmt = toLineFormat(data)
        mainSeries.setData(lineFmt)
      } else {
        const candleFmt = toChartFormat(data)
        mainSeries.setData(candleFmt)
      }
      
      const volData = data.map((d) => ({
        time: (typeof d.time === "number" ? d.time : Math.floor(Number(d.time))) as import("lightweight-charts").UTCTimestamp,
        value: d.volume ?? 0,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }))
      volumeSeries.setData(volData)
      
      // Update indicators if changed
      if (indicatorsChanged && chartRef.current) {
        updateIndicators(chartRef.current, data, indicators)
      }
    }
  }, [data, dataKey, chartType, indicators, createChartInstance, toLineFormat, updateIndicators])

  useEffect(() => {
    return () => {
      chartRef.current?.remove()
      chartRef.current = null
      mainSeriesRef.current = null
      volumeSeriesRef.current = null
      indicatorSeriesRef.current.clear()
    }
  }, [dataKey])

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ 
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || height || 400,
        })
      }
    }

    window.addEventListener("resize", handleResize)
    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    handleResize()
    return () => {
      window.removeEventListener("resize", handleResize)
      resizeObserver.disconnect()
    }
  }, [height])

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full", className)}
      style={height ? { height } : undefined}
    />
  )
}
