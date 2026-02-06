"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { History, ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LedgerEntry } from "@/lib/yellowNetwork/types"

interface TransactionHistoryProps {
  ledgerEntries: LedgerEntry[]
  refreshLedgerEntries: () => Promise<void>
  isAuthenticated: boolean
}

function formatDate(createdAt: string) {
  try {
    const d = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  } catch {
    return createdAt
  }
}

function getTransactionLabel(entry: LedgerEntry): string {
  const credit = parseFloat(entry.credit || "0")
  const debit = parseFloat(entry.debit || "0")
  if (credit > 0 && debit === 0) return "Credit"
  if (debit > 0 && credit === 0) return "Debit"
  return "Transfer"
}

export function TransactionHistory({
  ledgerEntries,
  refreshLedgerEntries,
  isAuthenticated,
}: TransactionHistoryProps) {
  useEffect(() => {
    if (isAuthenticated) {
      refreshLedgerEntries()
    }
  }, [isAuthenticated, refreshLedgerEntries])

  const sortedEntries = [...ledgerEntries].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
      style={{ fontFamily: "var(--font-figtree), Figtree" }}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Transaction History
        </h3>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => refreshLedgerEntries()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="max-h-[320px] overflow-y-auto">
        {!isAuthenticated ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Connect and authenticate to view transaction history
            </p>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No transactions yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Deposits, withdrawals, and trades will appear here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 sticky top-0">
              <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Asset</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-right py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => {
                const credit = parseFloat(entry.credit || "0")
                const debit = parseFloat(entry.debit || "0")
                const isCredit = credit > 0
                const amount = isCredit ? credit : debit
                const label = getTransactionLabel(entry)

                return (
                  <tr
                    key={entry.id}
                    className="border-t border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-lg",
                            isCredit
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-amber-500/15 text-amber-500"
                          )}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-foreground font-medium uppercase">
                        {entry.asset || "—"}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right text-sm font-semibold",
                        isCredit ? "text-emerald-500" : "text-amber-500"
                      )}
                    >
                      {isCredit ? "+" : "-"}
                      {amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  )
}
