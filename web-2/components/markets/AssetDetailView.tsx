"use client"

import { useState } from "react"
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
import { ChevronDown, ArrowDown, HelpCircle } from "lucide-react"
import type { AssetData } from "@/lib/sparkline-data"
import { cn } from "@/lib/utils"

const CHART_RANGES = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1Y" },
  { key: "ALL", label: "ALL" },
]

function generateChartData(asset: AssetData, range: string) {
  const points =
    range === "1D"
      ? 24
      : range === "1W"
        ? 7
        : range === "1M"
          ? 30
          : range === "3M"
            ? 90
            : range === "1Y"
              ? 365
              : 48
  const data = asset.sparklineData
  const step = Math.max(1, Math.floor(data.length / points))
  const filtered = data.filter((_, i) => i % step === 0)
  return filtered.map((value, i) => ({
    time: i,
    value: Math.round(value * 100) / 100,
    displayValue: value.toFixed(2),
    label:
      range === "1D"
        ? `01/${30 + Math.floor(i / 12)} ${String(8 + (i % 12)).padStart(2, "0")}:30`
        : `${i + 1}`,
  }))
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
  const [chartRange, setChartRange] = useState("1D")
  const [payAmount, setPayAmount] = useState("0")
  const [receiveAmount, setReceiveAmount] = useState("0")
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [showMore, setShowMore] = useState(false)

  const positive = asset.change24h >= 0
  const chartData = generateChartData(asset, chartRange)

  const handlePayChange = (val: string) => {
    setPayAmount(val)
    if (parseFloat(val)) {
      setReceiveAmount((parseFloat(val) / asset.price).toFixed(4))
    } else {
      setReceiveAmount("0")
    }
  }

  const handleReceiveChange = (val: string) => {
    setReceiveAmount(val)
    if (parseFloat(val)) {
      setPayAmount((parseFloat(val) * asset.price).toFixed(2))
    } else {
      setPayAmount("0")
    }
  }

  const aboutText = `The iShares Silver Trust (the "Trust") seeks to reflect generally the performance of the price of silver. The Trust seeks to reflect such performance before payment of the Trust's expenses and liabilities. It is designed to provide a cost-effective and convenient way to invest in silver.`

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
                asset.iconBg
              )}
            >
              {asset.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-zinc-900">
                {asset.name} {asset.ticker}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Market Closed{" "}
                <Link href="#" className="underline hover:text-zinc-700">
                  (View Status Page)
                </Link>
              </p>
              <div className="flex items-baseline gap-4 mt-3">
                <span className="text-3xl font-bold text-zinc-900">
                  ${asset.price.toFixed(2)}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    positive ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {positive ? "▲" : "▼"} ${Math.abs(asset.change24h).toFixed(2)} (
                  {positive ? "+" : ""}
                  {asset.change24hPercent.toFixed(4)}%) 24H
                </span>
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
                      id={`chartGradient-${asset.id}`}
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
                            ${payload[0].value?.toFixed(2)}
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
                    fill={`url(#chartGradient-${asset.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* About section */}
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">
              About¹
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {showMore ? aboutText : aboutText.slice(0, 180) + "..."}{" "}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="text-zinc-900 font-medium hover:underline"
              >
                {showMore ? "Show Less" : "Show More"}
              </button>
            </p>
          </div>

          {/* Supported Chains + Underlying Asset */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-200">
            <div>
              <p className="text-xs text-zinc-500 mb-2">Supported Chains</p>
              <div className="flex gap-2">
                <ChainLogo color="bg-blue-600">⟠</ChainLogo>
                <ChainLogo color="bg-violet-500">◇</ChainLogo>
                <ChainLogo color="bg-amber-400 text-amber-900">◆</ChainLogo>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Underlying Asset Name</p>
              <p className="text-sm font-medium text-zinc-900">{asset.name}</p>
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
                        asset.iconBg
                      )}
                    >
                      {asset.icon.slice(0, 1)}
                    </div>
                    <span className="text-sm font-medium text-zinc-700">
                      {asset.ticker}
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
                    1 {asset.ticker} = {Math.round(asset.price)} USDC (
                    ${asset.price.toFixed(2)})
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

              {/* Sign In button */}
              <button
                type="button"
                className="w-full py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold transition-colors"
              >
                Sign In to Continue
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
