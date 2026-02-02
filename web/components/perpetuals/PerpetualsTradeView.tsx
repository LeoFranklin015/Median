"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { RainbowConnectButton } from "@/components/ConnectButton"
import { cn } from "@/lib/utils"

const CHART_TABS = [
  { key: "price", label: "Price", icon: BarChart3 },
  { key: "depth", label: "Depth", icon: Layers },
  { key: "positions", label: "Positions", icon: FileText },
  { key: "orders", label: "Orders", icon: Activity },
  { key: "trades", label: "Trades", icon: Activity },
]

const LEVERAGE_OPTIONS = ["0.1x", "1x", "2x", "5x", "10x", "25x", "50x"]

const SAMPLE_CHART_DATA = Array.from({ length: 48 }, (_, i) => ({
  time: i,
  value: 100 + Math.sin(i * 0.3) * 8 + (i * 0.2) + Math.random() * 2,
}))

const STATS = [
  { label: "24h Volume", value: "$42.5M" },
  { label: "Open Interest", value: "$128.3M" },
  { label: "Available Liquidity", value: "$89.2M" },
  { label: "Net Rate / 1h", value: "0.0012%" },
]

const PERP_MARKETS = [
  { ticker: "ETH", name: "Ethereum", price: 3842.5, change: 2.34 },
  { ticker: "BTC", name: "Bitcoin", price: 97420, change: -0.89 },
  { ticker: "SOL", name: "Solana", price: 212.4, change: 5.12 },
  { ticker: "AAPL", name: "Apple Inc", price: 228.9, change: 0.45 },
  { ticker: "TSLA", name: "Tesla", price: 248.5, change: -1.2 },
  { ticker: "NVDA", name: "NVIDIA", price: 142.5, change: -1.2 },
  { ticker: "MSFT", name: "Microsoft", price: 378.9, change: 1.1 },
  { ticker: "GOOGL", name: "Alphabet", price: 172.4, change: 0.8 },
]

export function PerpetualsTradeView() {
  const [chartTab, setChartTab] = useState("price")
  const [side, setSide] = useState<"long" | "short">("long")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [leverage, setLeverage] = useState("2x")
  const [payAmount, setPayAmount] = useState("")
  const [selectedMarket, setSelectedMarket] = useState(PERP_MARKETS[0])
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted ? resolvedTheme === "dark" : true

  const positive = selectedMarket.change >= 0

  const chartGridStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
  const chartTickFill = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top Stats Bar */}
      <div className="flex items-center gap-8 px-4 py-3 border-b border-border bg-background/50">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5">
            <span
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              {stat.label}
            </span>
            <span
              className="text-sm font-semibold text-foreground tabular-nums"
              style={{ fontFamily: "var(--font-mono), ui-monospace" }}
            >
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
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            style={{ fontFamily: "var(--font-figtree), Figtree" }}
          >
            Try Express Trading
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chart + Tabs */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          {/* Chart Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
            {CHART_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setChartTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    chartTab === tab.key
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === "positions" && (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                  {tab.key === "orders" && (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Chart Area */}
          <div className="flex-1 min-h-[300px] p-4">
            {chartTab === "price" && (
              <div className="h-full w-full rounded-lg bg-muted/30 border border-border p-4">
                <div className="h-full min-h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SAMPLE_CHART_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFD700" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartTickFill }} axisLine={false} tickLine={false} />
                      <YAxis orientation="right" tick={{ fontSize: 10, fill: chartTickFill }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(0)} domain={["dataMin - 5", "dataMax + 5"]} width={45} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div className="bg-card border border-border px-3 py-2 rounded-lg shadow-lg">
                              <p className="text-sm font-semibold text-foreground">
                                ${payload[0].value?.toFixed(2)}
                              </p>
                            </div>
                          ) : null
                        }
                      />
                      <Area type="monotone" dataKey="value" stroke="#FFD700" strokeWidth={2} fill="url(#chartFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {(chartTab === "depth" || chartTab === "positions" || chartTab === "orders" || chartTab === "trades") && (
              <div className="h-full flex items-center justify-center rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">
                  {chartTab === "positions" && "No open positions"}
                  {chartTab === "orders" && "No orders"}
                  {chartTab === "trades" && "No trades"}
                  {chartTab === "depth" && "Market depth chart"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Form */}
        <div className="w-[400px] flex-shrink-0 flex flex-col border-l border-border">
          <div className="p-4 border-b border-border relative">
            {/* Market Selector */}
            <div className="flex items-center justify-between mb-4 relative">
              <button
                type="button"
                onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors w-full"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}
                >
                  {selectedMarket.ticker.charAt(0)}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">
                    {selectedMarket.ticker}-PERP
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{selectedMarket.name}</p>
                </div>
                <ChevronDown
                  className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform", marketDropdownOpen && "rotate-180")}
                />
              </button>
              <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center text-right pl-2">
                <p className="text-lg font-semibold text-foreground tabular-nums">
                  ${selectedMarket.price.toLocaleString()}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    positive ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {positive ? "+" : ""}{selectedMarket.change}%
                </p>
              </div>
            </div>

            {marketDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMarketDropdownOpen(false)}
                  aria-hidden
                />
                <div className="absolute left-4 right-4 z-20 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
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
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}
                        >
                          {m.ticker.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{m.ticker}-PERP</p>
                          <p className="text-xs text-muted-foreground">{m.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">${m.price.toLocaleString()}</p>
                        <p
                          className={cn(
                            "text-xs tabular-nums",
                            m.change >= 0 ? "text-emerald-500" : "text-red-500"
                          )}
                        >
                          {m.change >= 0 ? "+" : ""}{m.change}%
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Long / Short / Swap */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSide("long")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all",
                  side === "long"
                    ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Long
              </button>
              <button
                type="button"
                onClick={() => setSide("short")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all",
                  side === "short"
                    ? "bg-red-500/20 text-red-500 border border-red-500/40"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                )}
              >
                <TrendingDown className="w-4 h-4" />
                Short
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              >
                Swap
              </button>
            </div>

            {/* Market / Limit */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOrderType("market")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  orderType === "market"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType("limit")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  orderType === "limit"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                Limit
              </button>
              <button
                type="button"
                className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Pay Input */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">Pay</label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={payAmount}
                  onChange={(e) =>
                    setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="flex-1 bg-transparent text-foreground text-lg font-medium focus:outline-none min-w-0 placeholder:text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono), ui-monospace" }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">USDC</span>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Leverage */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Leverage</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "#FFD700" }}>
                  {leverage}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LEVERAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLeverage(opt)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      leverage === opt
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Collateral / TP-SL */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Pool / Collateral In
                </label>
                <div className="p-3 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground">
                  —
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Take Profit / Stop Loss
                </label>
                <div className="p-3 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground">
                  —
                </div>
              </div>
            </div>

            {/* Connect / Trade Button */}
            <div className="mb-4">
              <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
                <RainbowConnectButton />
                <p className="text-xs text-muted-foreground mt-3">
                  Connect wallet to trade
                </p>
              </div>
            </div>

            {/* Execution Details */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Liquidation Price</span>
                <span className="text-foreground tabular-nums">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price Impact</span>
                <span className="text-foreground tabular-nums">0.000%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fees</span>
                <span className="text-foreground tabular-nums">0.000%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
