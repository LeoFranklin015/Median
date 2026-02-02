"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import {
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ChevronDown,
  BarChart3,
  Layers,
  FileText,
  Activity,
  Info,
  Settings,
  Plus,
  X,
  Maximize2,
  Camera,
  AlignVerticalSpaceAround,
  Ruler,
  CandlestickChart as CandlestickIcon,
  FunctionSquare,
} from "lucide-react"
import { CandlestickChartComponent, generateMockCandleData } from "./CandlestickChart"
import { RainbowConnectButton } from "@/components/ConnectButton"
import { cn } from "@/lib/utils"

const CHART_TABS = [
  { key: "price", label: "Price", icon: BarChart3 },
  { key: "depth", label: "Depth", icon: Layers },
]

const CHART_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "D", "W", "M"]

const POSITION_TABS = [
  { key: "positions", label: "Positions", count: 0 },
  { key: "orders", label: "Orders", count: 0 },
  { key: "trades", label: "Trades", count: 0 },
  { key: "claims", label: "Claims", count: 0 },
]

const LEVERAGE_MARKS = [0.1, 1, 2, 5, 10, 25, 50, 100]

const STATS = [
  { label: "24h Volume", value: "$42.5M" },
  { label: "Open Interest", value: "$128.3M" },
  { label: "Available Liquidity", value: "$89.2M" },
  { label: "Net Rate / 1h", value: "0.0012%" },
]

const PERP_MARKETS = [
  { ticker: "SOL", name: "Solana", price: 212.4, change: 5.12 },
  { ticker: "ETH", name: "Ethereum", price: 3842.5, change: 2.34 },
  { ticker: "BTC", name: "Bitcoin", price: 97420, change: -0.89 },
  { ticker: "AAPL", name: "Apple Inc", price: 228.9, change: 0.45 },
  { ticker: "TSLA", name: "Tesla", price: 248.5, change: -1.2 },
  { ticker: "NVDA", name: "NVIDIA", price: 142.5, change: -1.2 },
  { ticker: "MSFT", name: "Microsoft", price: 378.9, change: 1.1 },
  { ticker: "GOOGL", name: "Alphabet", price: 172.4, change: 0.8 },
]

function TokenLogo({ ticker }: { ticker: string }) {
  const colors: Record<string, string> = {
    SOL: "from-violet-400 to-cyan-400",
    ETH: "from-indigo-400 to-violet-500",
    BTC: "from-amber-400 to-orange-500",
    USDC: "from-blue-500 to-blue-600",
  }
  const bg = colors[ticker] || "from-[#FFD700] to-amber-500"
  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br shrink-0",
        bg
      )}
    >
      {ticker.slice(0, 2)}
    </div>
  )
}

export function PerpetualsTradeView() {
  const [chartTab, setChartTab] = useState("price")
  const [chartTimeframe, setChartTimeframe] = useState("5m")
  const [positionsTab, setPositionsTab] = useState("positions")
  const [side, setSide] = useState<"long" | "short">("long")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [leverage, setLeverage] = useState(25)
  const [payAmount, setPayAmount] = useState("")
  const [longAmount, setLongAmount] = useState("")
  const [selectedMarket, setSelectedMarket] = useState(PERP_MARKETS[0])
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false)
  const [tpSlEnabled, setTpSlEnabled] = useState(true)
  const [takeProfitPrice, setTakeProfitPrice] = useState("")
  const [stopLossPrice, setStopLossPrice] = useState("")
  const [executionDetailsOpen, setExecutionDetailsOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted ? resolvedTheme === "dark" : true

  const positive = selectedMarket.change >= 0

  const leverageSliderPercent = Math.min(100, ((leverage - 0.1) / 99.9) * 100)
  const nearestMark = LEVERAGE_MARKS.reduce((prev, curr) =>
    Math.abs(curr - leverage) < Math.abs(prev - leverage) ? curr : prev
  )

  const candleData = useMemo(
    () => generateMockCandleData(selectedMarket.price, 120, selectedMarket.ticker.length),
    [selectedMarket.price, selectedMarket.ticker]
  )

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Stats Bar */}
      <div className="flex items-center gap-8 px-4 py-3 border-b border-border bg-background/50">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums font-mono">
              {stat.value}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400">
            ⟠
          </div>
          <span className="text-sm text-muted-foreground">Arbitrum</span>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium"
          >
            Try Express Trading
          </button>
        </div>
      </div>

      {/* Main Content - Gap between boxes, no partition lines */}
      <div className="flex-1 flex min-h-0 gap-4 p-4 overflow-hidden">
        {/* Left: Chart box + Positions box */}
        <div className="flex-1 flex flex-col min-w-0 gap-4 overflow-hidden">
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
                <button className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <AlignVerticalSpaceAround className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <Ruler className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <CandlestickIcon className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-1 px-2 py-1 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground text-xs">
                  <FunctionSquare className="w-3.5 h-3.5" />
                  Indicators
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground ml-2">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Asset info line: SOL/USD · O H L C */}
            <div className="px-4 pb-2 flex items-center gap-2 text-xs font-mono flex-wrap">
              <span className="font-semibold text-foreground">{selectedMarket.ticker}/USD</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">O {selectedMarket.price.toFixed(4)}</span>
              <span className="text-emerald-500">H {(selectedMarket.price * 1.02).toFixed(4)}</span>
              <span className="text-red-500">L {(selectedMarket.price * 0.98).toFixed(4)}</span>
              <span className="text-foreground">C {selectedMarket.price.toFixed(4)}</span>
              <span className={positive ? "text-emerald-500" : "text-red-500"}>
                {positive ? "+" : ""}{(selectedMarket.price * selectedMarket.change / 100).toFixed(4)} ({positive ? "+" : ""}{selectedMarket.change}%)
              </span>
            </div>
            {/* Chart area - Candlestick with zoom, pan, crosshair */}
            <div className="flex-1 min-h-[280px] px-4 pb-4">
              {chartTab === "price" && (
                <div className="h-full w-full rounded-xl bg-muted/5 overflow-hidden">
                  <CandlestickChartComponent
                    data={candleData}
                    basePrice={selectedMarket.price}
                    height={320}
                    isDark={isDark}
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
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col min-h-[180px]">
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
        <div className="w-[400px] flex-shrink-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col overflow-y-auto">
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
                  <p className="text-xs text-muted-foreground mt-0.5">${longAmount && selectedMarket.price ? (parseFloat(longAmount) * selectedMarket.price).toFixed(2) : "0.00"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-w-0"
                >
                  <TokenLogo ticker={selectedMarket.ticker} />
                  <span className="text-sm font-semibold truncate">{selectedMarket.ticker}/USD</span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0", marketDropdownOpen && "rotate-180")} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Leverage: {leverage.toFixed(2)}x</p>

              {marketDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMarketDropdownOpen(false)} aria-hidden />
                  <div className="absolute right-5 left-5 z-20 mt-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden py-1">
                    {PERP_MARKETS.map((m) => (
                      <button
                        key={m.ticker}
                        type="button"
                        onClick={() => {
                          setSelectedMarket(m)
                          setMarketDropdownOpen(false)
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                          selectedMarket.ticker === m.ticker && "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <TokenLogo ticker={m.ticker} />
                          <div>
                            <p className="text-sm font-semibold">{m.ticker}/USD</p>
                            <p className="text-xs text-muted-foreground">{m.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium tabular-nums">${m.price.toLocaleString()}</p>
                          <p className={cn("text-xs tabular-nums", m.change >= 0 ? "text-emerald-500" : "text-red-500")}>
                            {m.change >= 0 ? "+" : ""}{m.change}%
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
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
                <span className="text-sm font-medium">{selectedMarket.ticker}-USDC</span>
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
