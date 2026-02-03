"use client"

import { useState } from "react"
import { useAccount, useBalance, useReadContract } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { formatUnits } from "viem"
import { motion } from "framer-motion"
import {
  Info,
  Calendar,
  Filter,
  DollarSign,
  Wallet,
  Settings,
  Shield,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useYellowNetwork } from "@/lib/yellowNetwork"

// Sepolia addresses
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const
const CUSTODY_CONTRACT_ADDRESS = "0x34BaaF75820C4256D25A0bF19c8B5FAdEf9A4d4C" as const

// ABI for custody contract getAccountsBalances function
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
const TABS = ["Active Positions", "Realized PnL", "Transaction History"] as const
const TABLE_HEADERS = ["Token", "Price", "Balance", "Unrealized PnL", "Proportion"]

const WIN_RATE_LEGEND = [
  { label: ">500%", color: "bg-emerald-500" },
  { label: "200% - 500%", color: "bg-emerald-400" },
  { label: "50% - 200%", color: "bg-emerald-300" },
  { label: "0% - 50%", color: "bg-red-400" },
  { label: "-50% - 0%", color: "bg-red-500" },
  { label: "<-50%", color: "bg-red-600" },
]

export function PortfolioView() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Active Positions")
  const [selectedFrame, setSelectedFrame] = useState<(typeof TIME_FRAMES)[number]>("7D")
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { unifiedBalances } = useYellowNetwork()

  // Fetch onchain USDC balance from wallet
  const { data: usdcBalance } = useBalance({
    address: address,
    token: USDC_ADDRESS,
    chainId: 11155111, // Sepolia chain ID
  })

  // Fetch custody balance from contract
  const { data: custodyBalanceData } = useReadContract({
    address: CUSTODY_CONTRACT_ADDRESS,
    abi: custodyContractABI,
    functionName: "getAccountsBalances",
    args: address ? [[address], [USDC_ADDRESS]] : undefined,
    chainId: 11155111, // Sepolia chain ID
    query: {
      enabled: !!address,
    },
  })

  // Format wallet balance (USDC has 6 decimals)
  const walletBalanceFormatted = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(2)
    : "0.00"

  // Format custody balance (USDC has 6 decimals)
  const custodyBalanceFormatted = custodyBalanceData && custodyBalanceData[0]?.[0]
    ? parseFloat(formatUnits(custodyBalanceData[0][0], 6)).toFixed(2)
    : "0.00"

  // Get unified balance from Yellow Network (USDC)
  const usdcUnifiedBalance = unifiedBalances.find(b => b.asset.toLowerCase() === 'usdc')
  const unifiedBalanceFormatted = usdcUnifiedBalance
    ? parseFloat(usdcUnifiedBalance.amount).toFixed(2)
    : "0.00"

  // Calculate total balance (wallet + custody + unified)
  const totalBalance = (
    parseFloat(walletBalanceFormatted) +
    parseFloat(custodyBalanceFormatted) +
    parseFloat(unifiedBalanceFormatted)
  ).toFixed(2)

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Timeframe selector - below navbar, at top of page */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end mb-6"
      >
        <div
          className="flex items-center rounded-lg p-1 bg-muted/50 border border-border"
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
      </motion.div>

      {/* Balance types - Wallet, Custody, Unified */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        {/* Wallet Balance */}
        <div
          className="group relative rounded-2xl border overflow-hidden transition-all duration-300 hover:border-[#FFD700]/40"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            borderColor: "hsl(var(--border))",
          }}
        >
          <div className="p-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors"
              style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700" }}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <p
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Wallet Balance
            </p>
            <p className="text-2xl font-bold text-foreground">${walletBalanceFormatted}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Your on-chain USDC wallet
            </p>
          </div>
        </div>

        {/* Custody Wallet Balance */}
        <div
          className="group relative rounded-2xl border overflow-hidden transition-all duration-300 hover:border-[#FFD700]/40"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            borderColor: "hsl(var(--border))",
          }}
        >
          <div className="p-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors"
              style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700" }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <p
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Trading Wallet Balance
            </p>
            <p className="text-2xl font-bold text-foreground">${custodyBalanceFormatted}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Platform balance for trading
            </p>
          </div>
        </div>

        {/* Unified Balance - highlighted as primary */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)",
            border: "1px solid rgba(255,215,0,0.35)",
            boxShadow: "0 0 40px -10px rgba(255,215,0,0.15)",
          }}
        >
          <div className="p-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(255,215,0,0.25)",
                color: "#FFD700",
              }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <p
              className="text-xs font-medium uppercase tracking-wider mb-1"
              style={{
                fontFamily: "var(--font-figtree), Figtree",
                color: "#FFD700",
              }}
            >
              Trading Account Balance
            </p>
            <p className="text-2xl font-bold text-foreground">${unifiedBalanceFormatted}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Instant trading balance
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Balance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-card border border-border p-6"
        >
          <h3
            className="text-sm font-medium text-muted-foreground mb-2"
            style={{ fontFamily: "var(--font-figtree), Figtree" }}
          >
            Total Balance
          </h3>
          <p className="text-2xl lg:text-3xl font-semibold text-foreground mb-4">
            ${totalBalance}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Trades</span>
              <span>-- --</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Traded Tokens</span>
              <span>--</span>
            </div>
          </div>
        </motion.div>

        {/* 7D Realized PnL */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl bg-card border border-border p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3
                className="text-sm font-medium text-muted-foreground"
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                7D Realized PnL
              </h3>
              <button
                type="button"
                className="p-0.5 text-muted-foreground hover:text-foreground rounded-full"
                aria-label="Info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Calendar className="w-3.5 h-3.5" />
              PNL Calendar
            </button>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-foreground mb-4">
            $0.00 (0.00%)
          </p>
          {/* Simple flat line graph placeholder */}
          <div className="h-12 rounded-lg bg-muted/50 flex items-end justify-stretch gap-0.5 pb-1 px-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 min-w-[2px] bg-muted-foreground/30 rounded-sm"
                style={{ height: "4px" }}
              />
            ))}
          </div>
        </motion.div>

        {/* 7D Win Rate */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl bg-card border border-border p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <h3
              className="text-sm font-medium text-muted-foreground"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              7D Win Rate
            </h3>
            <button
              type="button"
              className="p-0.5 text-muted-foreground hover:text-foreground rounded-full"
              aria-label="Info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-foreground mb-4">
            0.00%
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {WIN_RATE_LEGEND.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className={cn("w-2.5 h-2.5 rounded-sm flex-shrink-0", item.color)}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs + Filter + Table area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl bg-card border border-border overflow-hidden"
      >
        {/* Tabs and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border">
          <div className="flex gap-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-sm font-medium pb-2 border-b-2 transition-colors whitespace-nowrap -mb-px",
                  activeTab === tab
                    ? "text-foreground border-[#FFD700]"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: "rgba(255,215,0,0.15)",
                color: "#FFD700",
              }}
              aria-label="Dollar"
            >
              <DollarSign className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table headers */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
          {TABLE_HEADERS.map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-figtree), Figtree" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Empty state - different CTAs based on wallet connection */}
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div
            className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,215,0,0.06)" }}
          >
            <Wallet className="w-16 h-16 text-muted-foreground/60" />
            <div
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700" }}
            >
              <Settings className="w-5 h-5" />
            </div>
          </div>
          <p
            className="text-center text-muted-foreground mb-6 max-w-sm"
            style={{ fontFamily: "var(--font-figtree), Figtree" }}
          >
            {isConnected
              ? "Add funds to your trading wallet to start trading"
              : "Connect your wallet to view your portfolio"}
          </p>
          {isConnected ? (
            <button
              type="button"
              className="px-8 py-3 rounded-xl font-semibold text-background transition-opacity hover:opacity-90"
              style={{
                background: "#FFD700",
                fontFamily: "var(--font-figtree), Figtree",
              }}
            >
              Add funds to trading wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="px-8 py-3 rounded-xl font-semibold text-background transition-opacity hover:opacity-90"
              style={{
                background: "#FFD700",
                fontFamily: "var(--font-figtree), Figtree",
              }}
            >
              Connect wallet
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
