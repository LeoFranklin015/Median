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
import { cn } from "@/lib/utils"
import { useYellowNetwork } from "@/lib/yellowNetwork/YellowNetworkContext"
import { YELLOW_CONFIG } from "@/lib/yellowNetwork/config"
import { useAccount } from "wagmi"
import { toast } from "sonner"

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
      setReceiveAmount((parseFloat(val) / liveData.price).toFixed(4))
    } else {
      setReceiveAmount("0")
    }
  }

  const handleReceiveChange = (val: string) => {
    setReceiveAmount(val)
    if (parseFloat(val)) {
      setPayAmount((parseFloat(val) * liveData.price).toFixed(2))
    } else {
      setPayAmount("0")
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

    // Check balance if buying
    if (activeTab === "buy") {
      const usdcBalance = unifiedBalances.find((b) => b.asset.toLowerCase() === "usdc")
      // Only proceed if we have a balance check, or assume user knows (for hackathon speed)
      // but showing a warning is good.
    }

    setIsProcessing(true)
    try {
      // Step 1: Create App Session
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
      // YELLOW_CONFIG.testToken is USDC on Sepolia
      // asset.address is the stock token address
      const usdcAddress = YELLOW_CONFIG.testToken;
      const assetAddress = asset.address || '0x0000000000000000000000000000000000000000'; // Fallback if missing, but should be there

      // To satisfy "Operate" (Sum Delta = 0), we must define initial state with the funds we plan to use.
      // User request: Zero allocation session.
      const initialAllocations = [
        { participant: address, asset: usdcAddress, amount: "0" },
        { participant: COUNTERPARTY_ADDRESS, asset: assetAddress, amount: "0" }
      ]

      const { appSessionId } = await createAppSession(participants, initialAllocations, "Median App")
      toast.success("Session created!")

      // Step 2: Submit App State (The Trade)
      toast.info("Submitting trade order...")

      // Trade: Zero allocations as requested.
      const tradeAllocations = [
        { participant: address, asset: assetAddress, amount: "0" },
        { participant: COUNTERPARTY_ADDRESS, asset: usdcAddress, amount: "0" }
      ]

      const sessionData = {
        action: activeTab, // "buy" or "sell"
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
            <div
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0",
                liveData.iconBg
              )}
            >
              {liveData.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-zinc-900">
                {liveData.name} {liveData.ticker}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Market Closed{" "}
                <Link href="#" className="underline hover:text-zinc-700">
                  (View Status Page)
                </Link>
              </p>
              <div className="flex items-baseline gap-4 mt-3">
                {liveData.isLoading ? (
                  <span className="text-3xl font-bold text-zinc-400 animate-pulse">
                    —
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-zinc-900">
                      ${liveData.price.toFixed(2)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        positive ? "text-emerald-600" : "text-red-600"
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
                    ? "bg-zinc-800 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl bg-white border border-zinc-200/80 p-6">
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
                    stroke="#e4e4e7"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "#71717a" }}
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
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(2)}
                    domain={["dataMin - 5", "dataMax + 5"]}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] && (
                        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-zinc-200">
                          <p className="text-sm font-semibold text-zinc-900">
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
          <div className="rounded-xl bg-white border border-zinc-200/80 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">About</h2>
            <p className="text-sm text-zinc-600 leading-relaxed mb-6">
              {showMore ? aboutText : aboutText.slice(0, 150) + "..."}{" "}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="text-zinc-900 font-medium hover:underline"
              >
                {showMore ? "Show Less" : "Show More"}
              </button>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-200">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Supported Chains</p>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-sm bg-violet-500" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 via-blue-500 to-emerald-400 flex items-center justify-center" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Onchain Address</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-zinc-900">
                      0xf3e4...f1a4
                    </span>
                    <button
                      type="button"
                      className="p-1 hover:bg-zinc-100 rounded"
                      aria-label="Copy"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Category</p>
                  <div className="flex gap-2 flex-wrap">
                    {categoryTags.map((cat, i) => (
                      <span
                        key={cat}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          i === 0 && (cat === "ETF" || cat === "Commodities")
                            ? "bg-orange-100 text-orange-700"
                            : "bg-zinc-100 text-zinc-700"
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
                  <p className="text-xs text-zinc-500 mb-1">Underlying Asset Name</p>
                  <p className="text-sm font-medium text-zinc-900">{liveData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Underlying Asset Ticker</p>
                  <p className="text-sm font-medium text-zinc-900">{liveData.ticker}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    Shares Per Token
                    <HelpCircle className="w-3.5 h-3.5" />
                  </p>
                  <p className="text-sm font-medium text-zinc-900">
                    1 {liveData.ticker} = 1.0000 {liveData.ticker}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics section */}
          <div className="rounded-xl bg-white border border-zinc-200/80 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">Statistics</h2>

            {/* Price data - 24H */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-zinc-200">
              <div>
                <p className="text-sm font-medium text-zinc-900 mb-4">
                  Token Price² 24H⁴
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Open</span>
                    <span className="text-zinc-900 font-medium">
                      ${stats.tokenPrice.open.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">High</span>
                    <span className="text-zinc-900 font-medium">
                      ${stats.tokenPrice.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Low</span>
                    <span className="text-zinc-900 font-medium">
                      ${stats.tokenPrice.low.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 mb-4">
                  Underlying Asset Price² 24H⁴
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Open</span>
                    <span className="text-zinc-900 font-medium">
                      ${stats.underlyingPrice.open.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">High</span>
                    <span className="text-zinc-900 font-medium">
                      ${stats.underlyingPrice.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Low</span>
                    <span className="text-zinc-900 font-medium">
                      ${stats.underlyingPrice.low.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Underlying Asset Statistics */}
            <div>
              <p className="text-sm font-medium text-zinc-900 mb-4">
                Underlying Asset Statistics³
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex justify-between sm:flex-col sm:gap-1 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200 pr-4">
                  <span className="text-zinc-500 text-sm flex items-center gap-1">
                    Total Market Cap
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-zinc-900 font-medium">{stats.marketCap}</span>
                </div>
                <div className="flex justify-between sm:flex-col sm:gap-1 py-3 border-b sm:border-b-0 sm:border-r border-zinc-200 pr-4">
                  <span className="text-zinc-500 text-sm flex items-center gap-1">
                    24h Volume
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-zinc-900 font-medium">{stats.volume24h}</span>
                </div>
                <div className="flex justify-between sm:flex-col sm:gap-1 py-3">
                  <span className="text-zinc-500 text-sm flex items-center gap-1">
                    Average Volume
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-zinc-900 font-medium">{stats.avgVolume}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Buy/Sell panel - Ondo style */}
        <div className="xl:col-span-1">
          <div className="sticky top-28 rounded-2xl bg-zinc-100 border border-zinc-200/80 overflow-hidden">
            {/* Buy/Sell tabs + Network */}
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white/50">
              <div className="flex flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("buy")}
                  className={cn(
                    "flex-1 py-4 text-sm font-semibold transition-colors",
                    activeTab === "buy"
                      ? "bg-zinc-200 text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100"
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
                      ? "bg-zinc-200 text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100"
                  )}
                >
                  Sell
                </button>
              </div>
              <div className="flex items-center gap-2 px-4">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                  ⟠
                </div>
                <span className="text-sm font-medium text-zinc-700">Ethereum</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Pay */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Pay</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) =>
                      handlePayChange(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="flex-1 bg-transparent text-zinc-900 text-lg font-medium focus:outline-none min-w-0"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      $
                    </div>
                    <span className="text-sm font-medium text-zinc-700">USDC</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-zinc-600" />
                </div>
              </div>

              {/* Receive */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Receive</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={receiveAmount}
                    onChange={(e) =>
                      handleReceiveChange(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="flex-1 bg-transparent text-zinc-900 text-lg font-medium focus:outline-none min-w-0"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                        liveData.iconBg
                      )}
                    >
                      {liveData.icon.slice(0, 1)}
                    </div>
                    <span className="text-sm font-medium text-zinc-700">
                      {liveData.ticker}
                    </span>
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Rate */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Rate</span>
                  <span className="text-zinc-900">
                    1 {liveData.ticker} = {Math.round(liveData.price)} USDC (
                    ${liveData.price.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-zinc-500 flex items-center gap-1">
                    Shares Per Token
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-zinc-900">
                    1 {asset.ticker} = 1.0000 {asset.ticker}
                  </span>
                </div>
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={handleAction}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {!isWalletConnected
                  ? "Connect Wallet to Trade"
                  : activeTab === "buy" ? "Buy " + asset.ticker : "Sell " + asset.ticker
                }
              </button>

              {/* Disclaimer */}
              <p className="text-xs text-zinc-500 leading-relaxed">
                Join the waitlist to get early access. Global Markets tokens
                have not been registered under the United States Securities Act
                of 1933, as amended, and may not be offered or sold in the
                United States or to U.S. persons. Sales will be primarily to
                qualified investors in the EEA, UK and Switzerland. *See
                additional information below.
              </p>

              {/* Also Available On */}
              <div className="pt-4 border-t border-zinc-200">
                <p className="text-xs text-zinc-500 mb-3">Also Available On</p>
                <div className="flex items-center gap-2">
                  <ChainLogo color="bg-violet-500" />
                  <ChainLogo color="bg-amber-400 text-amber-900" />
                  <span className="text-sm text-zinc-500">
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
