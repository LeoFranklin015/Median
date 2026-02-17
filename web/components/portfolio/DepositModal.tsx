"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Coins, DollarSign, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ASSETS, type AssetData } from "@/lib/sparkline-data"
import { CHAIN_OPTIONS } from "@/lib/chains"

const LOGOKIT_TOKEN = "pk_frfbe2dd55bc04b3d4d1bc"

type DepositType = "stock" | "usdc"

export interface DepositStockPayload {
  type: "stock"
  stock: string
  chain: string
  chainId: number
}

export interface DepositUsdcPayload {
  type: "usdc"
  amount: string
  chain: string
  chainId: number
}

export type DepositPayload = DepositStockPayload | DepositUsdcPayload

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (payload: DepositPayload) => Promise<void>
}

export function DepositModal({ isOpen, onClose, onConfirm }: DepositModalProps) {
  const [depositType, setDepositType] = useState<DepositType>("usdc")
  const [selectedStock, setSelectedStock] = useState<AssetData | null>(null)
  const [amount, setAmount] = useState("")
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const selectedChain = CHAIN_OPTIONS[0] // Always use Base

  const handleConfirm = async () => {
    if (depositType === "stock") {
      if (!selectedStock) return
      setIsLoading(true)
      try {
        await onConfirm({
          type: "stock",
          stock: selectedStock.ticker,
          chain: selectedChain.id,
          chainId: selectedChain.chainId,
        })
        onClose()
        resetForm()
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    } else {
      if (!amount || parseFloat(amount) <= 0) return
      setIsLoading(true)
      try {
        await onConfirm({
          type: "usdc",
          amount,
          chain: selectedChain.id,
          chainId: selectedChain.chainId,
        })
        onClose()
        resetForm()
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const resetForm = () => {
    setDepositType("usdc")
    setSelectedStock(null)
    setAmount("")
  }

  const canConfirm =
    depositType === "stock"
      ? !!selectedStock
      : !!amount && parseFloat(amount) > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-visible"
            style={{ fontFamily: "var(--font-figtree), Figtree" }}
          >
            {/* Background glow */}
            <div
              className="absolute top-0 right-0 -m-20 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: "#FFD700" }}
            />

            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Deposit to Trading Wallet
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Choose what you want to deposit
              </p>

              {/* Deposit type tabs */}
              <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border border-border mb-6">
                <button
                  type="button"
                  onClick={() => setDepositType("usdc")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                    depositType === "usdc"
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                  USDC
                </button>
                <button
                  type="button"
                  onClick={() => setDepositType("stock")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                    depositType === "stock"
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Coins className="w-4 h-4" />
                  Stock Tokens
                </button>
              </div>

              {/* Form content */}
              {depositType === "usdc" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Amount (USDC)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 pl-10 text-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Chain
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                        className="w-full flex items-center justify-between gap-2 bg-muted/50 border border-border rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                        disabled={isLoading}
                      >
                        <span className="font-medium text-foreground">{selectedChain.name}</span>
                        <ChevronDown
                          className={cn("w-4 h-4 text-muted-foreground transition-transform", isChainDropdownOpen && "rotate-180")}
                        />
                      </button>
                      {isChainDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsChainDropdownOpen(false)}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                            {CHAIN_OPTIONS.map((chain) => (
                              <button
                                key={chain.id}
                                type="button"
                                onClick={() => {
                                  setSelectedChain(chain)
                                  setIsChainDropdownOpen(false)
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors flex-shrink-0",
                                  selectedChain.id === chain.id && "bg-muted/30"
                                )}
                              >
                                <span className="font-medium text-foreground">{chain.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Select Stock
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                        className="w-full flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                        disabled={isLoading}
                      >
                        {selectedStock ? (
                          <>
                            <img
                              src={`https://img.logokit.com/ticker/${selectedStock.ticker}?token=${LOGOKIT_TOKEN}`}
                              alt={selectedStock.ticker}
                              className="w-8 h-8 rounded-full object-cover bg-muted"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                            <div className="text-left">
                              <span className="font-medium text-foreground">{selectedStock.ticker}</span>
                              <span className="block text-xs text-muted-foreground">{selectedStock.name}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Choose a stock...</span>
                        )}
                        <ChevronDown
                          className={cn("ml-auto w-4 h-4 text-muted-foreground transition-transform", isStockDropdownOpen && "rotate-180")}
                        />
                      </button>
                      {isStockDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsStockDropdownOpen(false)}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                            {ASSETS.map((asset) => (
                              <button
                                key={asset.ticker}
                                type="button"
                                onClick={() => {
                                  setSelectedStock(asset)
                                  setIsStockDropdownOpen(false)
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                                  selectedStock?.ticker === asset.ticker && "bg-muted/30"
                                )}
                              >
                                <img
                                  src={`https://img.logokit.com/ticker/${asset.ticker}?token=${LOGOKIT_TOKEN}`}
                                  alt={asset.ticker}
                                  className="w-8 h-8 rounded-full object-cover bg-muted"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none"
                                  }}
                                />
                                <div className="text-left">
                                  <span className="font-medium text-foreground">{asset.ticker}</span>
                                  <span className="block text-xs text-muted-foreground">{asset.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Chain
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                        className="w-full flex items-center justify-between gap-2 bg-muted/50 border border-border rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                        disabled={isLoading}
                      >
                        <span className="font-medium text-foreground">{selectedChain.name}</span>
                        <ChevronDown
                          className={cn("w-4 h-4 text-muted-foreground transition-transform", isChainDropdownOpen && "rotate-180")}
                        />
                      </button>
                      {isChainDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsChainDropdownOpen(false)}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                            {CHAIN_OPTIONS.map((chain) => (
                              <button
                                key={chain.id}
                                type="button"
                                onClick={() => {
                                  setSelectedChain(chain)
                                  setIsChainDropdownOpen(false)
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors flex-shrink-0",
                                  selectedChain.id === chain.id && "bg-muted/30"
                                )}
                              >
                                <span className="font-medium text-foreground">{chain.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading || !canConfirm}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-opacity",
                    isLoading || !canConfirm
                      ? "bg-muted cursor-not-allowed text-muted-foreground"
                      : "bg-[#FFD700] text-background hover:opacity-90"
                  )}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Deposit
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
