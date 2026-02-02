"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import {
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ChevronDown,
  BarChart3,
  Layers,
  Info,
  Settings,
  Plus,
  X,
  Maximize2,
  Minimize2,
  Camera,
  CandlestickChart as CandlestickIcon,
  FunctionSquare,
  Search,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { CandlestickChartComponent, generateMockCandleData } from "./CandlestickChart"
import { useBybitKline } from "@/hooks/useBybitKline"
import { useBybitTickers, type TickerData } from "@/hooks/useBybitTickers"
import { RainbowConnectButton } from "@/components/ConnectButton"
import { cn } from "@/lib/utils"
import { tickerToBybitSymbol } from "@/lib/bybit"

const CHART_TABS = [
  { key: "price", label: "Price", icon: BarChart3 },
  { key: "depth", label: "Depth", icon: Layers },
]

const CHART_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "D", "W", "M"]

const CHART_TYPES = [
  { key: "candlestick", label: "Candles", icon: "🕯️" },
  { key: "hollow", label: "Hollow Candles", icon: "◯" },
  { key: "bar", label: "Bars", icon: "▌" },
  { key: "line", label: "Line", icon: "📈" },
  { key: "area", label: "Area", icon: "▤" },
] as const

type ChartType = typeof CHART_TYPES[number]["key"]

const INDICATORS = [
  { key: "SMA", label: "Simple MA", color: "#3b82f6", period: 20 },
  { key: "EMA", label: "Exponential MA", color: "#8b5cf6", period: 20 },
  { key: "BB", label: "Bollinger Bands", color: "#f59e0b", period: 20 },
  { key: "RSI", label: "RSI", color: "#ec4899", period: 14 },
  { key: "MACD", label: "MACD", color: "#10b981", period: 12 },
  { key: "VOL", label: "Volume", color: "#6366f1", period: 0 },
] as const

type IndicatorKey = typeof INDICATORS[number]["key"]

const POSITION_TABS = [
  { key: "positions", label: "Positions", count: 0 },
  { key: "orders", label: "Orders", count: 0 },
  { key: "trades", label: "Trades", count: 0 },
  { key: "claims", label: "Claims", count: 0 },
]

const MARKET_TABS = [
  { key: "all", label: "All Markets" },
  { key: "favorites", label: "Favorites" },
  { key: "layer1", label: "Layer 1" },
  { key: "defi", label: "DeFi" },
  { key: "meme", label: "Meme" },
]

const LEVERAGE_MARKS = [0.1, 1, 2, 5, 10, 25, 50, 100]

const TOKEN_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  LINK: "Chainlink",
  SUI: "Sui",
  DOGE: "Dogecoin",
  XRP: "Ripple",
  AVAX: "Avalanche",
  ATOM: "Cosmos",
  ADA: "Cardano",
  DOT: "Polkadot",
  LTC: "Litecoin",
  ARB: "Arbitrum",
  OP: "Optimism",
  PEPE: "Pepe",
  WIF: "dogwifhat",
  BONK: "Bonk",
  SEI: "Sei",
  APT: "Aptos",
  FIL: "Filecoin",
  NEAR: "NEAR",
  INJ: "Injective",
  TIA: "Celestia",
}

const MAX_LEVERAGE: Record<string, number> = {
  BTC: 100,
  ETH: 100,
  SOL: 100,
  LINK: 100,
  SUI: 50,
  DOGE: 100,
  XRP: 100,
  default: 50,
}

const LOGOKIT_TOKEN = "pk_frfbe2dd55bc04b3d4d1bc"

function getLogoUrl(ticker: string): string {
  return `https://img.logokit.com/crypto/${ticker.toUpperCase()}?token=${LOGOKIT_TOKEN}`
}

function TokenLogo({ ticker, size = "md" }: { ticker: string; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false)
  
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }
  
  const fallbackColors: Record<string, string> = {
    SOL: "from-violet-400 to-cyan-400",
    ETH: "from-indigo-400 to-violet-500",
    BTC: "from-amber-400 to-orange-500",
    USDC: "from-blue-500 to-blue-600",
    LINK: "from-blue-400 to-blue-600",
    SUI: "from-cyan-400 to-blue-500",
    DOGE: "from-yellow-400 to-amber-500",
    XRP: "from-gray-400 to-gray-600",
    AVAX: "from-red-400 to-red-600",
    ARB: "from-blue-500 to-indigo-600",
    OP: "from-red-500 to-red-600",
    PEPE: "from-green-400 to-green-600",
  }
  
  const textSizes = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  }
  
  if (imgError) {
    const bg = fallbackColors[ticker] || "from-[#FFD700] to-amber-500"
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br shrink-0",
          sizeClasses[size],
          textSizes[size],
          bg
        )}
      >
        {ticker.slice(0, 2)}
      </div>
    )
  }
  
  return (
    <img
      src={getLogoUrl(ticker)}
      alt={`${ticker} logo`}
      className={cn("rounded-full shrink-0 object-cover", sizeClasses[size])}
      onError={() => setImgError(true)}
    />
  )
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function formatPrice(value: number): string {
  if (value >= 10000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (value >= 100) return value.toFixed(2)
  if (value >= 1) return value.toFixed(4)
  return value.toFixed(6)
}

export function PerpetualsTradeView() {
  const [chartTab, setChartTab] = useState("price")
  const [chartTimeframe, setChartTimeframe] = useState("5m")
  const [chartType, setChartType] = useState<ChartType>("candlestick")
  const [chartTypeDropdownOpen, setChartTypeDropdownOpen] = useState(false)
  const [indicatorsDropdownOpen, setIndicatorsDropdownOpen] = useState(false)
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(new Set(["VOL"]))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [positionsTab, setPositionsTab] = useState("positions")
  const [marketTab, setMarketTab] = useState("all")
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<"long" | "short">("long")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [leverage, setLeverage] = useState(25)
  const [payAmount, setPayAmount] = useState("")
  const [longAmount, setLongAmount] = useState("")
  const [selectedTicker, setSelectedTicker] = useState("SOL")
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false)
  const [marketSearchQuery, setMarketSearchQuery] = useState("")
  const [tpSlEnabled, setTpSlEnabled] = useState(true)
  const [takeProfitPrice, setTakeProfitPrice] = useState("")
  const [stopLossPrice, setStopLossPrice] = useState("")
  const [executionDetailsOpen, setExecutionDetailsOpen] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted ? resolvedTheme === "dark" : true

  // Live tickers from Bybit
  const { tickersList, getTickerByTicker, loading: tickersLoading } = useBybitTickers()

  // Get selected market data
  const selectedMarket = getTickerByTicker(selectedTicker)
  const selectedPrice = selectedMarket?.price ?? 0
  const selectedChange = selectedMarket?.changePct24h ?? 0
  const positive = selectedChange >= 0

  const leverageSliderPercent = Math.min(100, ((leverage - 0.1) / 99.9) * 100)
  const nearestMark = LEVERAGE_MARKS.reduce((prev, curr) =>
    Math.abs(curr - leverage) < Math.abs(prev - leverage) ? curr : prev
  )

  const {
    data: bybitData,
    loading: candleLoading,
    error: candleError,
    isSupported,
  } = useBybitKline(selectedTicker, chartTimeframe)

  const mockData = useMemo(
    () => generateMockCandleData(selectedPrice || 100, 120, selectedTicker.length),
    [selectedPrice, selectedTicker]
  )

  const candleData = isSupported ? bybitData : mockData

  // Filter markets based on search and tab
  const filteredMarkets = useMemo(() => {
    let markets = tickersList
    if (marketTab === "favorites") {
      markets = markets.filter((m) => favorites.has(m.ticker))
    }
    if (marketSearchQuery.trim()) {
      const q = marketSearchQuery.toLowerCase()
      markets = markets.filter(
        (m) =>
          m.ticker.toLowerCase().includes(q) ||
          (TOKEN_NAMES[m.ticker]?.toLowerCase().includes(q) ?? false)
      )
    }
    return markets
  }, [tickersList, marketTab, marketSearchQuery, favorites])

  const toggleFavorite = (ticker: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) {
        next.delete(ticker)
      } else {
        next.add(ticker)
      }
      return next
    })
  }

  const toggleIndicator = (key: IndicatorKey) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Screenshot function - captures the chart area
  const handleScreenshot = useCallback(async () => {
    const chartEl = chartContainerRef.current
    if (!chartEl) return

    try {
      // Use html2canvas if available, otherwise use native canvas approach
      const canvas = document.createElement("canvas")
      const rect = chartEl.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
      
      // Try to use the browser's native screenshot capability
      // For a proper implementation, you'd use html2canvas library
      const dataUrl = await new Promise<string>((resolve) => {
        // Find the lightweight-charts canvas inside
        const chartCanvas = chartEl.querySelector("canvas")
        if (chartCanvas) {
          resolve(chartCanvas.toDataURL("image/png"))
        } else {
          resolve("")
        }
      })

      if (dataUrl) {
        // Create download link
        const link = document.createElement("a")
        link.download = `${selectedTicker}-chart-${new Date().toISOString().slice(0, 10)}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error("Screenshot failed:", err)
    }
  }, [selectedTicker])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const chartEl = chartContainerRef.current
    if (!chartEl) return

    if (!document.fullscreenElement) {
      chartEl.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error("Fullscreen failed:", err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      })
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Stats Bar with Market Selector */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        {/* Market Selector Dropdown */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors min-w-[180px]"
          >
            <TokenLogo ticker={selectedTicker} size="md" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{selectedTicker}/USD</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {selectedTicker}-USDC
                </span>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", marketDropdownOpen && "rotate-180")} />
          </button>

          {/* Market Dropdown */}
          {marketDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMarketDropdownOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-2 z-50 w-[500px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search Market"
                      value={marketSearchQuery}
                      onChange={(e) => setMarketSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
                  {MARKET_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setMarketTab(tab.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                        marketTab === tab.key
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {/* Markets List Header */}
                <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[10px] font-medium text-muted-foreground border-b border-border">
                  <span className="col-span-2">MARKET</span>
                  <span className="text-right">LAST PRICE</span>
                  <span className="text-right">24H%</span>
                  <span className="text-right">24H VOL.</span>
                  <span className="text-right">OPEN INT.</span>
                </div>
                {/* Markets List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredMarkets.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {tickersLoading ? "Loading markets..." : "No markets found"}
                    </div>
                  ) : (
                    filteredMarkets.map((m) => (
                      <div
                        key={m.ticker}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedTicker(m.ticker)
                          setMarketDropdownOpen(false)
                          setMarketSearchQuery("")
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSelectedTicker(m.ticker)
                            setMarketDropdownOpen(false)
                            setMarketSearchQuery("")
                          }
                        }}
                        className={cn(
                          "grid grid-cols-6 gap-2 w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left items-center cursor-pointer",
                          selectedTicker === m.ticker && "bg-muted/20"
                        )}
                      >
                        <div className="col-span-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(m.ticker)
                            }}
                            className={cn(
                              "p-0.5 rounded hover:bg-muted/50",
                              favorites.has(m.ticker) ? "text-yellow-500" : "text-muted-foreground"
                            )}
                          >
                            <Star className="w-3.5 h-3.5" fill={favorites.has(m.ticker) ? "currentColor" : "none"} />
                          </button>
                          <TokenLogo ticker={m.ticker} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm">{m.ticker}/USD</span>
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                {MAX_LEVERAGE[m.ticker] || MAX_LEVERAGE.default}x
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-right text-sm font-medium tabular-nums">
                          ${formatPrice(m.price)}
                        </span>
                        <span className={cn("text-right text-sm tabular-nums", m.changePct24h >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {m.changePct24h >= 0 ? "+" : ""}{m.changePct24h.toFixed(2)}%
                        </span>
                        <span className="text-right text-sm text-muted-foreground tabular-nums">
                          {formatVolume(m.turnover24h)}
                        </span>
                        <span className="text-right text-sm text-muted-foreground tabular-nums">
                          {formatVolume(m.openInterest)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vertical Separator */}
        <div className="h-10 w-px bg-border flex-shrink-0" />

        {/* Price + Change */}
        <div className="flex items-baseline gap-3 flex-shrink-0">
          <span className="text-xl font-bold tabular-nums">
            ${mounted && selectedPrice ? formatPrice(selectedPrice) : "—"}
          </span>
          {mounted && selectedMarket && (
            <span className={cn("text-sm font-medium tabular-nums flex items-center gap-1", positive ? "text-emerald-500" : "text-red-500")}>
              {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {positive ? "+" : ""}{selectedChange.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Vertical Separator */}
        <div className="h-10 w-px bg-border flex-shrink-0" />

        {/* Live Stats */}
        <div className="flex items-center gap-5 flex-1 min-w-0 text-xs overflow-x-auto">
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">24H Volume</span>
            <span className="font-semibold tabular-nums">{mounted && selectedMarket ? formatVolume(selectedMarket.turnover24h) : "—"}</span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">24H High</span>
            <span className="font-semibold tabular-nums text-emerald-500">
              {mounted && selectedMarket ? `$${formatPrice(selectedMarket.high24h)}` : "—"}
            </span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">24H Low</span>
            <span className="font-semibold tabular-nums text-red-500">
              {mounted && selectedMarket ? `$${formatPrice(selectedMarket.low24h)}` : "—"}
            </span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">Open Interest</span>
            <span className="font-semibold tabular-nums">
              {mounted && selectedMarket ? (
                <span className="flex items-center gap-1">
                  <span className="text-emerald-500">↗{formatVolume(selectedMarket.openInterest * 0.43)}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-500">↘{formatVolume(selectedMarket.openInterest * 0.57)}</span>
                </span>
              ) : "—"}
            </span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">Funding Rate</span>
            <span className={cn("font-semibold tabular-nums", selectedMarket && selectedMarket.fundingRate >= 0 ? "text-emerald-500" : "text-red-500")}>
              {mounted && selectedMarket ? `${selectedMarket.fundingRate >= 0 ? "+" : ""}${selectedMarket.fundingRate.toFixed(4)}%` : "—"}
            </span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">Index Price</span>
            <span className="font-semibold tabular-nums">
              {mounted && selectedPrice ? `$${formatPrice(selectedPrice * 0.9999)}` : "—"}
            </span>
          </div>
          <div className="flex flex-col whitespace-nowrap">
            <span className="text-muted-foreground text-[10px] mb-0.5">Available Liquidity</span>
            <span className="font-semibold tabular-nums text-blue-400">
              {mounted && selectedMarket ? (
                <>
                  ↗{formatVolume(selectedMarket.openInterest * 0.32)} / ↘{formatVolume(selectedMarket.openInterest * 0.28)}
                </>
              ) : "—"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content - Gap between boxes, no partition lines */}
      <div className="flex-1 flex min-h-0 gap-3 p-3 overflow-hidden">
        {/* Left Markets Panel */}
        <div className="w-[320px] flex-shrink-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Market"
                value={marketSearchQuery}
                onChange={(e) => setMarketSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
            {MARKET_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMarketTab(tab.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  marketTab === tab.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Header */}
          <div className="grid grid-cols-4 gap-1 px-3 py-2 text-[10px] font-medium text-muted-foreground border-b border-border">
            <span className="col-span-2">MARKET</span>
            <span className="text-right">LAST PRICE</span>
            <span className="text-right">24H%</span>
          </div>
          {/* Markets List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMarkets.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {tickersLoading ? "Loading markets..." : "No markets found"}
              </div>
            ) : (
              filteredMarkets.map((m) => (
                <div
                  key={m.ticker}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTicker(m.ticker)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedTicker(m.ticker)}
                  className={cn(
                    "grid grid-cols-4 gap-1 w-full px-3 py-2.5 hover:bg-muted/30 transition-colors text-left items-center cursor-pointer",
                    selectedTicker === m.ticker && "bg-muted/20 border-l-2 border-l-blue-500"
                  )}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(m.ticker)
                      }}
                      className={cn(
                        "p-0.5 rounded hover:bg-muted/50",
                        favorites.has(m.ticker) ? "text-yellow-500" : "text-muted-foreground/50"
                      )}
                    >
                      <Star className="w-3 h-3" fill={favorites.has(m.ticker) ? "currentColor" : "none"} />
                    </button>
                    <TokenLogo ticker={m.ticker} size="sm" />
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-xs">{m.ticker}/USD</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground">
                        {MAX_LEVERAGE[m.ticker] || MAX_LEVERAGE.default}x
                      </span>
                    </div>
                  </div>
                  <span className="text-right text-xs font-medium tabular-nums">
                    ${formatPrice(m.price)}
                  </span>
                  <span className={cn("text-right text-xs tabular-nums", m.changePct24h >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {m.changePct24h >= 0 ? "+" : ""}{m.changePct24h.toFixed(2)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: Chart box + Positions box */}
        <div className="flex-1 flex flex-col min-w-0 gap-3 overflow-hidden">
          {/* Chart Box - Single unified component */}
          <div className="flex-1 min-h-[320px] rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
            {/* Chart header row */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 flex-wrap">
              <div className="flex items-center gap-2">
                {CHART_TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setChartTab(tab.key)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        chartTab === tab.key
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {CHART_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setChartTimeframe(tf)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                      chartTimeframe === tf
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {/* Chart Type Selector */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setChartTypeDropdownOpen(!chartTypeDropdownOpen)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-sm",
                      chartTypeDropdownOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Chart Type"
                  >
                    <CandlestickIcon className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {chartTypeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setChartTypeDropdownOpen(false)} aria-hidden />
                      <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-card shadow-xl overflow-hidden py-1">
                        <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Chart Type
                        </div>
                        {CHART_TYPES.map((type) => (
                          <button
                            key={type.key}
                            type="button"
                            onClick={() => {
                              setChartType(type.key)
                              setChartTypeDropdownOpen(false)
                            }}
                            className={cn(
                              "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                              chartType === type.key && "bg-muted/30 text-foreground"
                            )}
                          >
                            <span className="w-5 text-center">{type.icon}</span>
                            <span>{type.label}</span>
                            {chartType === type.key && (
                              <span className="ml-auto text-blue-500">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Indicators Selector */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIndicatorsDropdownOpen(!indicatorsDropdownOpen)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-sm",
                      indicatorsDropdownOpen || activeIndicators.size > 0 ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FunctionSquare className="w-4 h-4" />
                    <span>Indicators</span>
                    {activeIndicators.size > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-medium">
                        {activeIndicators.size}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {indicatorsDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIndicatorsDropdownOpen(false)} aria-hidden />
                      <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-card shadow-xl overflow-hidden py-1">
                        <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Technical Indicators
                        </div>
                        {INDICATORS.map((indicator) => (
                          <button
                            key={indicator.key}
                            type="button"
                            onClick={() => toggleIndicator(indicator.key)}
                            className={cn(
                              "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                              activeIndicators.has(indicator.key) && "bg-muted/30"
                            )}
                          >
                            <div 
                              className="w-3 h-3 rounded-sm border-2" 
                              style={{ 
                                borderColor: indicator.color,
                                backgroundColor: activeIndicators.has(indicator.key) ? indicator.color : "transparent"
                              }}
                            />
                            <div className="flex-1">
                              <span className="font-medium">{indicator.label}</span>
                              <span className="text-muted-foreground ml-1 text-xs">({indicator.key})</span>
                            </div>
                            {activeIndicators.has(indicator.key) && (
                              <span className="text-blue-500">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Fullscreen Button */}
                <button 
                  type="button"
                  onClick={toggleFullscreen}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-muted/50 transition-colors",
                    isFullscreen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                
                {/* Screenshot Button */}
                <button 
                  type="button"
                  onClick={handleScreenshot}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  title="Take Screenshot"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Asset info line: SOL/USD · O H L C */}
            <div className="px-4 pb-2 flex items-center gap-2 text-xs font-mono flex-wrap">
              <span className="font-semibold text-foreground">{selectedTicker}/USD</span>
              {mounted && isSupported && bybitData.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[10px] font-medium">
                  Live
                </span>
              )}
              <span className="text-muted-foreground">·</span>
              {(() => {
                const useLive = mounted && candleData.length > 0
                const last = useLive ? candleData[candleData.length - 1] : null
                const fallbackPrice = selectedPrice || 100
                const o = last?.open ?? fallbackPrice
                const h = last?.high ?? fallbackPrice * 1.02
                const l = last?.low ?? fallbackPrice * 0.98
                const c = last?.close ?? fallbackPrice
                const chg = o > 0 ? ((c - o) / o) * 100 : 0
                return (
                  <>
                    <span className="text-muted-foreground">O {formatPrice(o)}</span>
                    <span className="text-emerald-500">H {formatPrice(h)}</span>
                    <span className="text-red-500">L {formatPrice(l)}</span>
                    <span className="text-foreground">C {formatPrice(c)}</span>
                    <span className={chg >= 0 ? "text-emerald-500" : "text-red-500"}>
                      {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                    </span>
                  </>
                )
              })()}
            </div>
            {/* Chart area - Candlestick with zoom, pan, crosshair */}
            <div className="flex-1 min-h-0 px-4 pb-4">
              {chartTab === "price" && (
                <div 
                  ref={chartContainerRef}
                  className={cn(
                    "h-full w-full rounded-xl overflow-hidden relative",
                    isFullscreen && "bg-background fixed inset-0 z-50 rounded-none p-4"
                  )}
                >
                  {/* Fullscreen header when in fullscreen mode */}
                  {isFullscreen && (
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                      <div className="flex items-center gap-3">
                        <TokenLogo ticker={selectedTicker} size="lg" />
                        <div>
                          <div className="text-lg font-bold">{selectedTicker}/USD</div>
                          <div className="text-sm text-muted-foreground">
                            ${formatPrice(selectedPrice || 0)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Minimize2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  {candleLoading && candleData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
                      <div className="animate-pulse text-sm text-muted-foreground">Loading chart…</div>
                    </div>
                  )}
                  {candleError && (
                    <div className="absolute top-2 left-4 right-4 bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-lg z-10">
                      {candleError}
                    </div>
                  )}
                  <CandlestickChartComponent
                    data={candleData}
                    dataKey={`${selectedTicker}-${chartTimeframe}-${chartType}`}
                    basePrice={selectedPrice || 100}
                    height={isFullscreen ? window.innerHeight - 80 : undefined}
                    isDark={isDark}
                    chartType={chartType}
                    indicators={Array.from(activeIndicators)}
                    className={isFullscreen ? "pt-16" : ""}
                  />
                </div>
              )}
              {chartTab === "depth" && (
                <div className="h-full flex items-center justify-center rounded-xl bg-muted/10">
                  <p className="text-sm text-muted-foreground">Market depth</p>
                </div>
              )}
            </div>
            <div className="px-4 pb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px] font-bold">TV</div>
              <span>TradingView</span>
            </div>
          </div>

          {/* Positions Box - Separate component */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
              <div className="flex items-center gap-1">
                {POSITION_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPositionsTab(tab.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      positionsTab === tab.key
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tab.label} {tab.count}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                Chart positions
              </label>
            </div>
            <div className="flex-1 px-4 pb-4 overflow-auto">
              <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground px-2 py-2 border-b border-border">
                <span>POSITION</span>
                <span>SIZE</span>
                <span>NET VALUE</span>
                <span>COLLATERAL</span>
                <span>ENTRY PRICE</span>
                <span>MARK PRICE</span>
                <span>LIQ. PRICE</span>
              </div>
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No open positions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Swap/Trade Box - Single unified component */}
        <div className="w-[360px] flex-shrink-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Long / Short / Swap - Dark green active state */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/30">
              <button
                type="button"
                onClick={() => setSide("long")}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all",
                  side === "long"
                    ? "bg-emerald-600/30 text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Long
                {side === "long" && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSide("short")}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all",
                  side === "short"
                    ? "bg-red-600/30 text-red-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingDown className="w-4 h-4" />
                Short
                {side === "short" && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-red-400" />
                )}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Swap
              </button>
            </div>

            {/* Market / Limit / More + Icons */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden bg-muted/30 p-0.5 flex-1">
                <button
                  type="button"
                  onClick={() => setOrderType("market")}
                  className={cn(
                    "flex-1 py-2.5 rounded-md text-sm font-semibold transition-all",
                    orderType === "market"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("limit")}
                  className={cn(
                    "flex-1 py-2.5 rounded-md text-sm font-semibold transition-all",
                    orderType === "limit"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Limit
                </button>
              </div>
              <button
                type="button"
                className="p-2.5 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Pay - Card style */}
            <div className="rounded-xl bg-muted/20 border border-border p-4">
              <label className="block text-xs font-medium text-muted-foreground mb-2">Pay</label>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full bg-transparent text-xl font-semibold text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">${payAmount ? (parseFloat(payAmount) || 0).toFixed(2) : "0.00"}</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <TokenLogo ticker="USDC" />
                  <span className="text-sm font-semibold">USDC</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Long/Short - Card with pair selector */}
            <div className="rounded-xl bg-muted/20 border border-border p-4 relative">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {side === "long" ? "Long" : "Short"}
              </label>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={longAmount}
                    onChange={(e) => setLongAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full bg-transparent text-xl font-semibold text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">${longAmount && selectedPrice ? (parseFloat(longAmount) * selectedPrice).toFixed(2) : "0.00"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-w-0"
                >
                  <TokenLogo ticker={selectedTicker} />
                  <span className="text-sm font-semibold truncate">{selectedTicker}/USD</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Leverage: {leverage.toFixed(2)}x</p>
            </div>

            {/* Leverage Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Leverage</span>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <input
                      type="range"
                      min={0.1}
                      max={100}
                      step={0.1}
                      value={leverage}
                      onChange={(e) => setLeverage(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${leverageSliderPercent}%, rgba(255,255,255,0.1) ${leverageSliderPercent}%, rgba(255,255,255,0.1) 100%)`,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm font-semibold tabular-nums min-w-[70px]"
                  >
                    {nearestMark} x
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {LEVERAGE_MARKS.map((m) => (
                  <span key={m}>{m}X</span>
                ))}
              </div>
            </div>

            {/* Pool */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Pool</label>
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/20 border border-border hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium">{selectedTicker}-USDC</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Collateral In */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                Collateral In
                <Info className="w-3.5 h-3.5" />
              </label>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/20 border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <TokenLogo ticker="USDC" />
                  <span className="text-sm font-medium">USDC</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Take Profit / Stop Loss Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Take Profit / Stop Loss</span>
              <button
                type="button"
                role="switch"
                aria-checked={tpSlEnabled}
                onClick={() => setTpSlEnabled(!tpSlEnabled)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  tpSlEnabled ? "bg-blue-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    tpSlEnabled ? "left-6" : "left-1"
                  )}
                />
              </button>
            </div>

            {tpSlEnabled && (
              <div className="space-y-4 rounded-xl bg-muted/20 border border-border p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Take Profit</span>
                    <button type="button" className="p-1 rounded hover:bg-muted/50">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground">$</span>
                      <input
                        type="text"
                        placeholder="Price"
                        value={takeProfitPrice}
                        onChange={(e) => setTakeProfitPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <button className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm font-medium hover:bg-muted/50">
                      100%
                    </button>
                    <button className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Take Profit PnL —</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Stop Loss</span>
                    <button type="button" className="p-1 rounded hover:bg-muted/50">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                      <span className="text-muted-foreground">$</span>
                      <input
                        type="text"
                        placeholder="Price"
                        value={stopLossPrice}
                        onChange={(e) => setStopLossPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <button className="px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm font-medium hover:bg-muted/50">
                      100%
                    </button>
                    <button className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Stop Loss PnL —</p>
                </div>
              </div>
            )}

            {/* Connect Wallet - Prominent Blue Button */}
            <div className="pt-2 [&_button]:!w-full [&_button]:!py-4 [&_button]:!rounded-xl [&_button]:!text-base [&_button]:!font-semibold [&_button]:!bg-blue-500 [&_button]:!text-white [&_button]:!border-0 [&_button]:!justify-center [&_button]:hover:!bg-blue-600 [&_button]:!transition-colors">
              <RainbowConnectButton />
            </div>

            {/* Bottom Details - same box, spaced */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Liquidation Price</span>
                <span className="font-medium tabular-nums">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price Impact / Fees</span>
                <span className="font-medium tabular-nums">0.000% / 0.000%</span>
              </div>
              <button
                type="button"
                onClick={() => setExecutionDetailsOpen(!executionDetailsOpen)}
                className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground"
              >
                Execution Details
                <ChevronDown className={cn("w-4 h-4 transition-transform", executionDetailsOpen && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
