"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, DollarSign, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHAIN_OPTIONS } from "@/lib/chains"

export interface WithdrawPayload {
  type: "usdc" | "stock"
  amount: string
  chain: string
  chainId: number
  ticker?: string
  address?: string
}

interface StockHolding {
  ticker: string
  name: string
  amount: number
  chainId: number
  address: string
}

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (payload: WithdrawPayload) => Promise<void>
  availableBalance: number
  stockHoldings: StockHolding[]
}

export function WithdrawModal({
  isOpen,
  onClose,
  onConfirm,
  availableBalance,
  stockHoldings,
}: WithdrawModalProps) {
  const [assetType, setAssetType] = useState<"usdc" | "stock">("usdc")
  const [amount, setAmount] = useState("")
  const [selectedChain, setSelectedChain] = useState<(typeof CHAIN_OPTIONS)[number]>(CHAIN_OPTIONS[0])
  const [selectedStock, setSelectedStock] = useState<StockHolding | null>(stockHoldings[0] || null)
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false)
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    if (assetType === "stock" && !selectedStock) return

    setIsLoading(true)
    try {
      await onConfirm({
        type: assetType,
        amount,
        chain: assetType === "stock" ? selectedStock!.chainId.toString() : selectedChain.id,
        chainId: assetType === "stock" ? selectedStock!.chainId : selectedChain.chainId,
        ticker: assetType === "stock" ? selectedStock?.ticker : undefined,
        address: assetType === "stock" ? selectedStock?.address : undefined,
      })
      onClose()
      resetForm()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setAssetType("usdc")
    setAmount("")
    setSelectedChain(CHAIN_OPTIONS[0])
    setSelectedStock(stockHoldings[0] || null)
  }

  const amountNum = parseFloat(amount) || 0
  const maxBalance = assetType === "usdc" ? availableBalance : (selectedStock?.amount || 0)
  const canConfirm = amountNum > 0 && amountNum <= maxBalance

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
                Withdraw {assetType === "usdc" ? "USDC" : "Stock"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Choose the asset, amount and destination chain
              </p>

              <div className="space-y-4">
                {/* Asset Type Selector */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Asset Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetType("usdc")}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        assetType === "usdc"
                          ? "bg-[#FFD700] text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      disabled={isLoading}
                    >
                      USDC
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetType("stock")}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        assetType === "stock"
                          ? "bg-[#FFD700] text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      disabled={isLoading}
                    >
                      Stock
                    </button>
                  </div>
                </div>

                {/* Stock Selector (only shown for stock type) */}
                {assetType === "stock" && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Select Stock
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                        className="w-full flex items-center justify-between gap-2 bg-muted/50 border border-border rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                        disabled={isLoading}
                      >
                        <span className="font-medium text-foreground">
                          {selectedStock ? `${selectedStock.ticker} - ${selectedStock.name}` : "Select a stock"}
                        </span>
                        <ChevronDown
                          className={cn("w-4 h-4 text-muted-foreground transition-transform", isStockDropdownOpen && "rotate-180")}
                        />
                      </button>
                      {isStockDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsStockDropdownOpen(false)}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                            {stockHoldings.map((stock) => (
                              <button
                                key={stock.ticker}
                                type="button"
                                onClick={() => {
                                  setSelectedStock(stock)
                                  setIsStockDropdownOpen(false)
                                  setAmount("") // Reset amount when changing stock
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                                  selectedStock?.ticker === stock.ticker && "bg-muted/30"
                                )}
                              >
                                <div>
                                  <span className="font-medium text-foreground block">{stock.ticker}</span>
                                  <span className="text-xs text-muted-foreground">{stock.name}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {stock.amount.toFixed(4)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Amount ({assetType === "usdc" ? "USDC" : selectedStock?.ticker || ""})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 pl-10 text-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-transparent"
                      disabled={isLoading || (assetType === "stock" && !selectedStock)}
                    />
                    {assetType === "usdc" && (
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {assetType === "usdc" ? "USDC" : selectedStock?.ticker || ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Available: <span className="font-medium text-foreground">
                      {assetType === "usdc"
                        ? `$${availableBalance.toFixed(2)}`
                        : selectedStock
                          ? `${selectedStock.amount.toFixed(6)} ${selectedStock.ticker}`
                          : "N/A"}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setAmount(maxBalance.toFixed(assetType === "usdc" ? 2 : 6))}
                    className="mt-1 text-xs font-medium text-[#FFD700] hover:underline"
                    disabled={isLoading || (assetType === "stock" && !selectedStock)}
                  >
                    Max
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {assetType === "stock" ? "Deployment Chain" : "Withdraw to chain"}
                  </label>
                  {assetType === "stock" && selectedStock ? (
                    <div className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground font-medium">
                      {CHAIN_OPTIONS.find(c => c.chainId === selectedStock.chainId)?.name || "Unknown Chain"}
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

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
                  Withdraw
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
