"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { ChevronDown, ArrowDown, HelpCircle, Copy, Loader2 } from "lucide-react"
import type { AssetData } from "@/lib/sparkline-data"
import { useAssetDetail } from "@/hooks/useAssetDetail"
import { cn, getStockLogoUrl } from "@/lib/utils"
import { useYellowNetwork } from "@/lib/yellowNetwork/YellowNetworkContext"
import { YELLOW_CONFIG } from "@/lib/yellowNetwork/config"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { AssetSelector, type PaymentAsset } from "./AssetSelector"

const CHART_RANGES = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1Y" },
  { key: "ALL", label: "ALL" },
]

// Hardcoded counterparty address for the hackathon
const COUNTERPARTY_ADDRESS = "0x4888Eb840a7Ca93F49C9be3dD95Fc0EdA25bF0c6"

function sampleChartData(
  data: { time: number; value: number }[],
  range: string
): { time: number; value: number }[] {
  const count =
    range === "1D" ? 24 : range === "1W" ? 7 : range === "1M" ? 30 : range === "3M" ? 90 : range === "1Y" ? 365 : data.length
  if (data.length <= count) return data
  const step = Math.floor(data.length / count)
  return data.filter((_, i) => i % step === 0).slice(-count)
}

function ChainLogo({ color, children }: { color: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
        color
      )}
    >
      {children}
    </div>
  )
}

export function AssetDetailView({ asset }: { asset: AssetData }) {
  const liveData = useAssetDetail(asset)
  const [chartRange, setChartRange] = useState("1D")
  const [payAmount, setPayAmount] = useState("0")
  const [receiveAmount, setReceiveAmount] = useState("0")
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [showMore, setShowMore] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentAsset, setPaymentAsset] = useState<PaymentAsset>({
    ticker: "USDC",
    name: "USD Coin",
    price: 1,
    address: YELLOW_CONFIG.testToken,
  })

  const { isConnected, isAuthenticated, connect, createAppSession, submitAppState, unifiedBalances } = useYellowNetwork()
  const { address } = useAccount()

  const chartData = useMemo(() => {
    if (liveData.chartData?.length) {
      return sampleChartData(liveData.chartData, chartRange)
    }
    const step = Math.max(1, Math.floor(liveData.sparklineData.length / 24))
    return liveData.sparklineData
      .filter((_, i) => i % step === 0)
      .map((v, i) => ({ time: i, value: v }))
  }, [liveData.chartData, liveData.sparklineData, chartRange])

  const positive = liveData.change24h >= 0

  const handlePayChange = (val: string) => {
    setPayAmount(val)
    if (parseFloat(val)) {
      // Calculate based on payment asset price vs target asset price
      const payAssetValue = parseFloat(val) * paymentAsset.price
      const receiveQty = payAssetValue / liveData.price
      setReceiveAmount(receiveQty.toFixed(4))
    } else {
      setReceiveAmount("0")
    }
  }

  const handleReceiveChange = (val: string) => {
    setReceiveAmount(val)
    if (parseFloat(val)) {
      // Calculate based on target asset price vs payment asset price
      const receiveAssetValue = parseFloat(val) * liveData.price
      const payQty = receiveAssetValue / paymentAsset.price
      setPayAmount(payQty.toFixed(4))
    } else {
      setPayAmount("0")
    }
  }

  const handleAssetSelect = (newAsset: PaymentAsset) => {
    setPaymentAsset(newAsset)
    // Recalculate amounts with new payment asset
    if (parseFloat(payAmount) > 0) {
      const payAssetValue = parseFloat(payAmount) * newAsset.price
      const receiveQty = payAssetValue / liveData.price
      setReceiveAmount(receiveQty.toFixed(4))
    }
  }

  // Original working USDC purchase function
  const handleUSDCPurchase = async () => {
    if (!address) {
      toast.error("Wallet address not found")
      return
    }

    setIsProcessing(true)
    try {
      toast.info("Creating trade session...")
      const participants = [address, COUNTERPARTY_ADDRESS]

      // Helper to convert to atomic units (USDC = 6 decimals, Others = 18)
      const toAtomicUnits = (val: string, decimals: number) => {
        if (!val) return "0"
        return BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals))).toString()
      }

      const usdcAtomic = toAtomicUnits(payAmount, 6)
      const assetAtomic = toAtomicUnits(receiveAmount, 18)

      // Use actual asset addresses
      const usdcAddress = YELLOW_CONFIG.testToken
      const assetAddress = asset.address || '0x0000000000000000000000000000000000000000'

      // Zero allocation session (working approach)
      const initialAllocations = [
        { participant: address, asset: usdcAddress, amount: "0" },
        { participant: COUNTERPARTY_ADDRESS, asset: assetAddress, amount: "0" }
      ]

      const { appSessionId } = await createAppSession(participants, initialAllocations, "Median App")
      toast.success("Session created!")

      // Step 2: Submit App State (The Trade)
      toast.info("Submitting trade order...")

      // Zero allocations (backend processes actual trade from sessionData)
      const tradeAllocations = [
        { participant: address, asset: assetAddress, amount: "0" },
        { participant: COUNTERPARTY_ADDRESS, asset: usdcAddress, amount: "0" }
      ]

      const sessionData = {
        action: activeTab,
        market: `${asset.ticker}/USDC`,
        price: liveData.price,
        amount: activeTab === "buy" ? usdcAtomic : assetAtomic,
        timestamp: Date.now()
      }

      await submitAppState(appSessionId, tradeAllocations, "operate", sessionData)

      toast.success(`Successfully ${activeTab === "buy" ? "bought" : "sold"} ${receiveAmount} ${asset.ticker}!`)

      // Reset form
      setPayAmount("0")
      setReceiveAmount("0")

    } catch (error) {
      console.error("Trade failed:", error)
      toast.error(`Trade failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // New function for stock-to-stock swaps
  const handleStockSwap = async () => {
    if (!address) {
      toast.error("Wallet address not found")
      return
    }

    setIsProcessing(true)
    try {
      toast.info("Creating swap session...")
      const participants = [address, COUNTERPARTY_ADDRESS]

      // Helper to convert to atomic units (stocks use 18 decimals)
      const toAtomicUnits = (val: string, decimals: number) => {
        if (!val) return "0"
        return BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals))).toString()
      }

      const payAmountAtomic = toAtomicUnits(payAmount, 18)
      const receiveAmountAtomic = toAtomicUnits(receiveAmount, 18)

      // Use actual asset addresses for allocations
      const paymentAddress = paymentAsset.address

      // Only sender's source token allocation
      const initialAllocations = [
        { participant: address, asset: paymentAddress, amount: "0" }
      ]

      const { appSessionId } = await createAppSession(participants, initialAllocations, "Median App")
      toast.success("Swap session created!")

      // Step 2: Submit swap state
      toast.info(`Submitting swap order: ${paymentAsset.ticker} → ${asset.ticker}...`)

      // Only sender's source token allocation
      const tradeAllocations = [
        { participant: address, asset: paymentAddress, amount: "0" }
      ]

      const sessionData = {
        action: "swap",
        market: `${asset.ticker}/${paymentAsset.ticker}`,
        paymentAsset: paymentAsset.ticker,
        paymentAssetPrice: paymentAsset.price,
        targetAsset: asset.ticker,
        targetAssetPrice: liveData.price,
        payAmountAtomic: payAmountAtomic,
        receiveAmountAtomic: receiveAmountAtomic,
        amount: payAmountAtomic,
        timestamp: Date.now()
      }

      await submitAppState(appSessionId, tradeAllocations, "operate", sessionData)

      toast.success(`Successfully swapping ${payAmount} ${paymentAsset.ticker} for ${receiveAmount} ${asset.ticker}!`)

      // Reset form
      setPayAmount("0")
      setReceiveAmount("0")

    } catch (error) {
      console.error("Swap failed:", error)
      toast.error(`Swap failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAction = async () => {
    if (!isConnected || !isAuthenticated) {
      await connect()
      return
    }

    if (!address) {
      toast.error("Wallet address not found")
      return
    }

    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    // Route to appropriate handler
    if (paymentAsset.ticker === "USDC") {
      await handleUSDCPurchase()
    } else {
      await handleStockSwap()
    }
  }

  const aboutText = `The Trust seeks to reflect such performance before payment of the Trust's expenses and liabilities. It is not actively managed. The Trust does not engage in any activities designed to obtain a profit from, or to ameliorate losses caused by, changes in the price of silver.`

  const open24h = liveData.price - liveData.change24h
  const high24h = Math.max(open24h, liveData.price) * 1.012
  const low24h = Math.min(open24h, liveData.price) * 0.988

  const stats = {
    tokenPrice: { open: open24h, high: high24h, low: low24h },
    underlyingPrice: { open: open24h, high: high24h, low: low24h },
    marketCap: liveData.marketCap ?? "$42.62B",
    volume24h: "510,753,638",
    avgVolume: "39,920,107",
  }

  const categoryTags = [...new Set([liveData.category, ...liveData.categories])].slice(0, 2)

  const isWalletConnected = isConnected && isAuthenticated

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Chart + Info */}
        <div className="xl:col-span-2 space-y-6">
          {/* Asset header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted overflow-hidden">
              <img
                src={getStockLogoUrl(liveData.ticker)}
                alt={liveData.ticker}
                className="w-12 h-12 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                  e.currentTarget.nextElementSibling?.classList.remove("hidden")
                }}
              />
              <span
                className={cn(
                  "hidden w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold",
                  liveData.iconBg
                )}
              >
                {liveData.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-foreground">
                {liveData.name} {liveData.ticker}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Market Closed{" "}
                <Link href="#" className="underline hover:text-foreground">
                  (View Status Page)
                </Link>
              </p>
              <div className="flex items-baseline gap-4 mt-3">
                {liveData.isLoading ? (
                  <span className="text-3xl font-bold text-muted-foreground animate-pulse">
                    —
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">
                      ${liveData.price.toFixed(2)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        positive ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {positive ? "▲" : "▼"} ${Math.abs(liveData.change24h).toFixed(2)} (
                      {positive ? "+" : ""}
                      {liveData.change24hPercent.toFixed(4)}%) 24H
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chart timeframe */}
          <div className="flex gap-2">
            {CHART_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => setChartRange(range.key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  chartRange === range.key
                    ? "bg-[#FFD700] text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient
                      id={`chartGradient-${liveData.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={positive ? "#22c55e" : "#ef4444"}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor={positive ? "#22c55e" : "#ef4444"}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(_, i) =>
                      chartRange === "1D"
                        ? `01/${30 + Math.floor(i / 12)} ${String(8 + (i % 12)).padStart(2, "0")}:30`
                        : `${i}`
                    }
                  />
                  <YAxis
                    orientation="right"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(2)}
                    domain={["dataMin - 5", "dataMax + 5"]}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] && (
                        <div className="bg-card px-4 py-2 rounded-lg shadow-lg border border-border">
                          <p className="text-sm font-semibold text-foreground">
                            ${Number(payload[0].value).toFixed(2)}
                          </p>
                        </div>
                      )
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={positive ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    fill={`url(#chartGradient-${liveData.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* About section */}
          <div className="rounded-xl bg-card border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {showMore ? aboutText : aboutText.slice(0, 150) + "..."}{" "}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="text-foreground font-medium hover:underline"
              >
                {showMore ? "Show Less" : "Show More"}
              </button>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Supported Chains</p>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-sm bg-violet-500" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 via-blue-500 to-emerald-400 flex items-center justify-center" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Onchain Address</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-foreground">
                      0xf3e4...f1a4
                    </span>
                    <button
                      type="button"
                      className="p-1 hover:bg-muted rounded"
                      aria-label="Copy"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Category</p>
                  <div className="flex gap-2 flex-wrap">
                    {categoryTags.map((cat, i) => (
                      <span
                        key={cat}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          i === 0 && (cat === "ETF" || cat === "Commodities")
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Underlying Asset Name</p>
                  <p className="text-sm font-medium text-foreground">{liveData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Underlying Asset Ticker</p>
                  <p className="text-sm font-medium text-foreground">{liveData.ticker}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    Shares Per Token
                    <HelpCircle className="w-3.5 h-3.5" />
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    1 {liveData.ticker} = 1.0000 {liveData.ticker}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics section */}
          <div className="rounded-xl bg-card border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-6">Statistics</h2>

            {/* Price data - 24H */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground mb-4">
                  Token Price² 24H⁴
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open</span>
                    <span className="text-foreground font-medium">
                      ${stats.tokenPrice.open.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">High</span>
                    <span className="text-foreground font-medium">
                      ${stats.tokenPrice.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Low</span>
                    <span className="text-foreground font-medium">
                      ${stats.tokenPrice.low.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-4">
                  Underlying Asset Price² 24H⁴
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open</span>
                    <span className="text-foreground font-medium">
                      ${stats.underlyingPrice.open.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">High</span>
                    <span className="text-foreground font-medium">
                      ${stats.underlyingPrice.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Low</span>
                    <span className="text-foreground font-medium">
                      ${stats.underlyingPrice.low.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Underlying Asset Statistics */}
            <div>
              <p className="text-sm font-medium text-foreground mb-4">
                Underlying Asset Statistics³
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex justify-between sm:flex-col sm:gap-1 py-3 border-b sm:border-b-0 sm:border-r border-border pr-4">
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    Total Market Cap
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-foreground font-medium">{stats.marketCap}</span>
                </div>
                <div className="flex justify-between sm:flex-col sm:gap-1 py-3 border-b sm:border-b-0 sm:border-r border-border pr-4">
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    24h Volume
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-foreground font-medium">{stats.volume24h}</span>
                </div>
                <div className="flex justify-between sm:flex-col sm:gap-1 py-3">
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    Average Volume
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-foreground font-medium">{stats.avgVolume}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Buy/Sell panel */}
        <div className="xl:col-span-1">
          <div className="sticky top-28 rounded-2xl bg-card border border-border overflow-hidden">
            {/* Buy/Sell tabs + Network */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30">
              <div className="flex flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("buy")}
                  className={cn(
                    "flex-1 py-4 text-sm font-semibold transition-colors",
                    activeTab === "buy"
                      ? "bg-[#FFD700] text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("sell")}
                  className={cn(
                    "flex-1 py-4 text-sm font-semibold transition-colors",
                    activeTab === "sell"
                      ? "bg-[#FFD700] text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  Sell
                </button>
              </div>
              <div className="flex items-center gap-2 px-4">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                  ⟠
                </div>
                <span className="text-sm font-medium text-foreground">Ethereum</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Pay */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Pay</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) =>
                      handlePayChange(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="flex-1 bg-transparent text-foreground text-lg font-medium focus:outline-none min-w-0 placeholder:text-muted-foreground"
                    placeholder="0.00"
                  />
                  <div className="flex-shrink-0">
                    <AssetSelector
                      selectedAsset={paymentAsset}
                      onSelectAsset={handleAssetSelect}
                      currentAssetTicker={asset.ticker}
                      unifiedBalances={unifiedBalances}
                    />
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {/* Receive */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Receive</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={receiveAmount}
                    onChange={(e) =>
                      handleReceiveChange(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="flex-1 bg-transparent text-foreground text-lg font-medium focus:outline-none min-w-0 placeholder:text-muted-foreground"
                    placeholder="0.00"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-muted">
                      <img
                        src={getStockLogoUrl(liveData.ticker)}
                        alt={liveData.ticker}
                        className="w-6 h-6 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                          e.currentTarget.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                      <span
                        className={cn(
                          "hidden w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                          liveData.iconBg
                        )}
                      >
                        {liveData.icon.slice(0, 1)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {liveData.ticker}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Rate */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="text-foreground">
                    1 {liveData.ticker} = {(liveData.price / paymentAsset.price).toFixed(4)} {paymentAsset.ticker}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="text-foreground">
                    ${(parseFloat(payAmount || "0") * paymentAsset.price).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Shares Per Token
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-foreground">
                    1 {asset.ticker} = 1.0000 {asset.ticker}
                  </span>
                </div>
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={handleAction}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#FFD700] text-background hover:opacity-90"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {!isWalletConnected
                  ? "Connect Wallet to Trade"
                  : activeTab === "buy"
                  ? paymentAsset.ticker === "USDC"
                    ? `Buy ${asset.ticker}`
                    : `Swap ${paymentAsset.ticker} → ${asset.ticker}`
                  : `Sell ${asset.ticker}`
                }
              </button>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Join the waitlist to get early access. Global Markets tokens
                have not been registered under the United States Securities Act
                of 1933, as amended, and may not be offered or sold in the
                United States or to U.S. persons. Sales will be primarily to
                qualified investors in the EEA, UK and Switzerland. *See
                additional information below.
              </p>

              {/* Also Available On */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">Also Available On</p>
                <div className="flex items-center gap-2">
                  <ChainLogo color="bg-violet-500" />
                  <ChainLogo color="bg-amber-400 text-amber-900" />
                  <span className="text-sm text-muted-foreground">
                    & 2 more{" "}
                    <ChevronDown className="w-4 h-4 inline -rotate-90" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
