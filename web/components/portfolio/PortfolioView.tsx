"use client"

import React, { useMemo, useState } from "react"
import { useAccount, useBalance, useReadContract } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { formatUnits } from "viem"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Wallet,
  Settings,
  Layers,
  Plus,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Zap,
  Sparkles,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { useYellowNetwork } from "@/lib/yellowNetwork"
import { useStockQuotes } from "@/hooks/useStockQuotes"
import { ASSETS, getAssetByTicker } from "@/lib/sparkline-data"
import { DepositModal, type DepositPayload } from "./DepositModal"
import { WithdrawModal, type WithdrawPayload } from "./WithdrawModal"
import { TransactionHistory } from "./TransactionHistory"
import { toast } from "sonner"

const LOGOKIT_TOKEN = "pk_frfbe2dd55bc04b3d4d1bc"

// Sepolia addresses
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const
const CUSTODY_CONTRACT_ADDRESS = "0xc4afa9235be46a337850B33B12C222F6a3ba1EEC" as const

const custodyContractABI = [
  {
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "tokens", type: "address[]" },
    ],
    name: "getAccountsBalances",
    outputs: [{ name: "", type: "uint256[][]" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const TIME_FRAMES = ["1D", "7D", "30D", "90D"] as const

const PIE_COLORS = {
  liquid: "#22c55e",
  nonLiquid: "#FFD700",
}

export function PortfolioView() {
  const [selectedFrame, setSelectedFrame] = useState<(typeof TIME_FRAMES)[number]>("7D")
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)

  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const {
    unifiedBalances,
    ledgerEntries,
    refreshLedgerEntries,
    depositToCustody,
    withdrawFromCustody,
    addToTradingBalance,
    withdrawFromTradingBalance,
    isAuthenticated,
  } = useYellowNetwork()
  const { assets: quotedAssets } = useStockQuotes()

  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: 11155111,
  })

  const { data: custodyBalanceData } = useReadContract({
    address: CUSTODY_CONTRACT_ADDRESS,
    abi: custodyContractABI,
    functionName: "getAccountsBalances",
    args: address ? [[address], [USDC_ADDRESS]] : undefined,
    chainId: 11155111,
    query: { enabled: !!address },
  })

  const walletBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals))
    : 0

  const custodyBalance =
    custodyBalanceData && custodyBalanceData[0]?.[0]
      ? parseFloat(formatUnits(custodyBalanceData[0][0], 6))
      : 0

  const usdcUnified = unifiedBalances.find((b) => b.asset.toLowerCase() === "usdc")
  const unifiedUsdcBalance = usdcUnified ? parseFloat(usdcUnified.amount) : 0

  const liquidValue = walletBalance + custodyBalance + unifiedUsdcBalance

  // Stock holdings from unifiedBalances (non-USDC assets)
  const stockHoldings = useMemo(() => {
    const stocks = unifiedBalances.filter((b) => b.asset.toLowerCase() !== "usdc")
    return stocks
      .map((b) => {
        const ticker = b.asset.toUpperCase()
        const asset = getAssetByTicker(ticker) || ASSETS.find((a) => a.ticker.toUpperCase() === ticker)
        const quote = quotedAssets.find((q) => q.ticker.toUpperCase() === ticker)
        const price = quote?.price ?? asset?.price ?? 0
        const amount = parseFloat(b.amount)
        const value = amount * price
        return {
          ticker,
          name: asset?.name ?? ticker,
          price,
          amount,
          value,
          change24hPercent: quote?.change24hPercent ?? asset?.change24hPercent ?? 0,
        }
      })
      .filter((h) => h.value > 0 || h.amount > 0)
      .sort((a, b) => b.value - a.value)
  }, [unifiedBalances, quotedAssets])

  const nonLiquidValue = useMemo(() => stockHoldings.reduce((s, h) => s + h.value, 0), [stockHoldings])
  const totalPortfolioValue = liquidValue + nonLiquidValue

  const pieData = useMemo(() => {
    const data = [
      { name: "Liquid (Stablecoins)", value: Math.max(0, liquidValue), color: PIE_COLORS.liquid },
      { name: "Non-liquid (Stocks)", value: Math.max(0, nonLiquidValue), color: PIE_COLORS.nonLiquid },
    ]
    return data.filter((d) => d.value > 0)
  }, [liquidValue, nonLiquidValue])

  const hasPortfolio = totalPortfolioValue > 0

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Balance cards - prominent display */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
        style={{ fontFamily: "var(--font-figtree), Figtree" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-card border border-border p-8 shadow-sm hover:shadow-lg transition-all overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-15 group-hover:opacity-25 transition-opacity bg-blue-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-500/20 text-blue-500 shadow-inner">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Wallet
                  </span>
                  <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mt-0.5">
                    ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">USDC in your connected wallet — ready to deposit</p>
            </div>
          </div>

          <div className="rounded-2xl bg-card border-2 border-[#FFD700]/40 p-8 shadow-sm hover:shadow-lg transition-all overflow-hidden relative group bg-gradient-to-br from-[#FFD700]/8 to-transparent">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-25 group-hover:opacity-35 transition-opacity" style={{ background: "#FFD700" }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: "rgba(255,215,0,0.25)", color: "#FFD700" }}>
                  <Layers className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#FFD700" }}>
                    Trading
                  </span>
                  <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mt-0.5">
                    ${unifiedUsdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Instant balance for orders — deposit to add funds</p>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-8 shadow-sm hover:shadow-lg transition-all overflow-hidden relative group">
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity bg-violet-500" />
            <div className="relative flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-violet-500/15 text-violet-500 shadow-inner">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Portfolio
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Liquid (USDC)</span>
                  <span className="font-medium text-foreground">${liquidValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stocks</span>
                  <span className="font-medium text-foreground">${nonLiquidValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div
            className="flex items-center rounded-lg p-1 bg-muted/50 border border-border w-fit"
            style={{ fontFamily: "var(--font-figtree), Figtree" }}
          >
            {TIME_FRAMES.map((frame) => (
              <button
                key={frame}
                onClick={() => setSelectedFrame(frame)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  selectedFrame === frame
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {frame}
              </button>
            ))}
          </div>
          {isConnected && (
            <p className="text-sm text-muted-foreground">
              Combined: <span className="font-semibold text-foreground">${liquidValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> USDC liquid
            </p>
          )}
        </div>
      </motion.div>

      {/* Main layout: 30% pie chart | 70% holdings table */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,30%)_1fr] gap-6 min-h-[500px]">
        {/* 30% - Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-card border border-border p-6 flex flex-col"
        >
          <h3
            className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider"
            style={{ fontFamily: "var(--font-figtree), Figtree" }}
          >
            Asset Allocation
          </h3>
          <div className="flex-1 min-h-[240px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="transparent"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,215,0,0.1)" }}
                >
                  <Wallet className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No assets yet</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Connect wallet and add funds to see your allocation
                </p>
              </div>
            )}
          </div>
          {hasPortfolio && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total portfolio</span>
                <span className="font-bold text-foreground">${totalPortfolioValue.toFixed(2)}</span>
              </div>
            </div>
          )}
          {isConnected && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}
              >
                <Plus className="w-3.5 h-3.5" /> Deposit
              </button>
              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="flex-1 min-w-[80px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" /> Withdraw
              </button>
            </div>
          )}
        </motion.div>

        {/* 70% - Holdings table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3
              className="text-sm font-medium text-foreground"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Stock Holdings
            </h3>
          </div>

          {!isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
              <div
                className="relative w-28 h-28 mb-6 flex items-center justify-center rounded-2xl"
                style={{ background: "rgba(255,215,0,0.06)" }}
              >
                <Wallet className="w-14 h-14 text-muted-foreground/60" />
                <div
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700" }}
                >
                  <Settings className="w-4 h-4" />
                </div>
              </div>
              <p className="text-center text-muted-foreground mb-6 max-w-sm">
                Connect your wallet to view your portfolio
              </p>
              <button
                type="button"
                onClick={() => openConnectModal?.()}
                className="px-6 py-2.5 rounded-xl font-semibold text-background"
                style={{ background: "#FFD700", fontFamily: "var(--font-figtree), Figtree" }}
              >
                Connect wallet
              </button>
            </div>
          ) : !hasPortfolio && stockHoldings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
              <p className="text-center text-muted-foreground mb-6">
                Deposit funds to start trading
              </p>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="px-6 py-2.5 rounded-xl font-semibold text-background"
                style={{ background: "#FFD700", fontFamily: "var(--font-figtree), Figtree" }}
              >
                Deposit funds
              </button>
            </div>
          ) : stockHoldings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
              <p className="text-center text-muted-foreground">
                No stock holdings. Trade on the Perpetuals page to open positions.
              </p>
              <Link
                href="/perpetuals"
                className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-background"
                style={{ background: "#FFD700", fontFamily: "var(--font-figtree), Figtree" }}
              >
                Trade Perpetuals
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontFamily: "var(--font-figtree), Figtree" }}>
                <thead>
                  <tr className="bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-4 px-4">Asset</th>
                    <th className="text-right py-4 px-4">Price</th>
                    <th className="text-right py-4 px-4">Balance</th>
                    <th className="text-right py-4 px-4">Value</th>
                    <th className="text-right py-4 px-4">24h Change</th>
                    <th className="text-right py-4 px-4">Proportion</th>
                  </tr>
                </thead>
                <tbody>
                  {stockHoldings.map((holding) => (
                    <tr
                      key={holding.ticker}
                      className="border-t border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <Link
                          href={`/markets/assets/${holding.ticker}`}
                          className="flex items-center gap-3 hover:text-[#FFD700] transition-colors"
                        >
                          <img
                            src={`https://img.logokit.com/ticker/${holding.ticker}?token=${LOGOKIT_TOKEN}`}
                            alt={holding.ticker}
                            className="w-8 h-8 rounded-full object-cover bg-muted"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                          <div>
                            <span className="font-medium text-foreground">{holding.ticker}</span>
                            <span className="block text-xs text-muted-foreground">{holding.name}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="text-right py-4 px-4 font-medium text-foreground">
                        ${holding.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right py-4 px-4 text-foreground">
                        {holding.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="text-right py-4 px-4 font-semibold text-foreground">
                        ${holding.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right py-4 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            holding.change24hPercent >= 0 ? "text-emerald-500" : "text-red-500"
                          )}
                        >
                          {holding.change24hPercent >= 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {holding.change24hPercent >= 0 ? "+" : ""}
                          {holding.change24hPercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right py-4 px-4 text-muted-foreground">
                        {totalPortfolioValue > 0
                          ? ((holding.value / totalPortfolioValue) * 100).toFixed(1)
                          : "0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail boxes below */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
      >
        <div
          className="rounded-xl bg-card border border-border p-5"
          style={{ fontFamily: "var(--font-figtree), Figtree" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700" }}
            >
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Trades
            </span>
          </div>
          <p className="text-xl font-bold text-foreground">--</p>
          <p className="text-xs text-muted-foreground mt-1">Lifetime trade count</p>
        </div>

        <div
          className="rounded-xl bg-card border border-border p-5"
          style={{ fontFamily: "var(--font-figtree), Figtree" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              7D Realized PnL
            </span>
          </div>
          <p className="text-xl font-bold text-foreground">$0.00</p>
          <p className="text-xs text-emerald-500/80 mt-1">0.00% this week</p>
        </div>

        <div
          className="rounded-xl bg-card border border-border p-5"
          style={{ fontFamily: "var(--font-figtree), Figtree" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700" }}
            >
              <Target className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              7D Win Rate
            </span>
          </div>
          <p className="text-xl font-bold text-foreground">0.00%</p>
          <p className="text-xs text-muted-foreground mt-1">Profitable trades</p>
        </div>

        <div
          className="rounded-xl bg-card border border-border p-5"
          style={{ fontFamily: "var(--font-figtree), Figtree" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700" }}
            >
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Assets Held
            </span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {stockHoldings.length > 0 ? stockHoldings.length : 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stockHoldings.length === 1 ? "Unique position" : "Unique positions"}
          </p>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-6"
      >
        <TransactionHistory
          ledgerEntries={ledgerEntries}
          refreshLedgerEntries={refreshLedgerEntries}
          isAuthenticated={!!isAuthenticated}
        />
      </motion.div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onConfirm={async (payload: DepositPayload) => {
          if (payload.type === "usdc") {
            try {
              // Step 1: Deposit to custody (on-chain)
              toast.info("Step 1/2: Depositing to custody...")
              await depositToCustody(payload.amount)

              // Step 2: Automatically add funds to trading balance
              toast.info("Step 2/2: Adding funds to trading balance...")
              await addToTradingBalance(payload.amount)

              toast.success(`Successfully deposited $${payload.amount} USDC to trading balance!`)
            } catch (error) {
              console.error("Deposit flow failed:", error)
              toast.error("Deposit failed. Please check your balances and try again.")
            }
          } else {
            toast.info(`${payload.stock} deposit on ${payload.chain} — stock token deposits coming soon`)
          }
        }}
      />
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={unifiedUsdcBalance}
        onConfirm={async (payload: WithdrawPayload) => {
          try {
            // Step 1: Withdraw from trading balance to custody
            toast.info("Step 1/2: Withdrawing from trading balance...")
            await withdrawFromTradingBalance(payload.amount)

            // Step 2: Withdraw from custody to wallet
            toast.info("Step 2/2: Withdrawing from custody to wallet...")
            await withdrawFromCustody(payload.amount)

            toast.success(`Successfully withdrew $${payload.amount} USDC to your wallet!`)
          } catch (error) {
            console.error("Withdraw flow failed:", error)
            toast.error("Withdrawal failed. Please check your balances and try again.")
          }
        }}
      />
    </div>
  )
}
