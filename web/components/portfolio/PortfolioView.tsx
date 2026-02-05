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
  Shield,
  Layers,
  Plus,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { useYellowNetwork } from "@/lib/yellowNetwork"
import { useStockQuotes } from "@/hooks/useStockQuotes"
import { ASSETS, getAssetByTicker } from "@/lib/sparkline-data"
import { AmountModal } from "./AmountModal"

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
  const [isWithdrawCustodyModalOpen, setIsWithdrawCustodyModalOpen] = useState(false)
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false)
  const [isWithdrawTradingModalOpen, setIsWithdrawTradingModalOpen] = useState(false)

  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const {
    unifiedBalances,
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
      {/* Timeframe + compact balance summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
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
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Wallet:</span>
            <span className="font-semibold text-foreground">${walletBalance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Custody:</span>
            <span className="font-semibold text-foreground">${custodyBalance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Trading:</span>
            <span className="font-semibold text-foreground">${unifiedUsdcBalance.toFixed(2)}</span>
          </div>
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
                    {pieData.map((entry, i) => (
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
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700" }}
              >
                <Plus className="w-3.5 h-3.5" /> Deposit
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => setIsAddFundsModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-background"
                  style={{ background: "#FFD700" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Trading
                </button>
              )}
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
                Add funds to your trading wallet to start trading
              </p>
              <button
                type="button"
                onClick={() => setIsAddFundsModalOpen(true)}
                className="px-6 py-2.5 rounded-xl font-semibold text-background"
                style={{ background: "#FFD700", fontFamily: "var(--font-figtree), Figtree" }}
              >
                Add funds to trading wallet
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

      <AmountModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onConfirm={async (amount) => { await depositToCustody(amount) }}
        title="Deposit to Trading Wallet"
        description="Deposit USDC from your wallet to the custody contract."
        actionLabel="Deposit"
      />
      <AmountModal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        onConfirm={addToTradingBalance}
        title="Add to Trading Account"
        description="Transfer funds from custody to your instant trading balance."
        actionLabel="Add Funds"
      />
      <AmountModal
        isOpen={isWithdrawCustodyModalOpen}
        onClose={() => setIsWithdrawCustodyModalOpen(false)}
        onConfirm={async (amount) => { await withdrawFromCustody(amount) }}
        title="Withdraw from Trading Wallet"
        description="Withdraw USDC from the custody contract back to your wallet."
        actionLabel="Withdraw"
      />
      <AmountModal
        isOpen={isWithdrawTradingModalOpen}
        onClose={() => setIsWithdrawTradingModalOpen(false)}
        onConfirm={withdrawFromTradingBalance}
        title="Withdraw from Trading Account"
        description="Transfer funds from your instant trading balance back to custody."
        actionLabel="Withdraw"
      />
    </div>
  )
}
