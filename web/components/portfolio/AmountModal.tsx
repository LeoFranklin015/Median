import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AmountModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (amount: string) => Promise<void>
    title: string
    description?: string
    actionLabel: string
}

export function AmountModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    actionLabel,
}: AmountModalProps) {
    const [amount, setAmount] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        if (!amount || parseFloat(amount) <= 0) return
        setIsLoading(true)
        try {
            await onConfirm(amount)
            onClose()
            setAmount("")
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

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
                        className="relative w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-lg overflow-hidden"
                    >
                        {/* Background effect */}
                        <div
                            className="absolute top-0 right-0 -m-16 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                            style={{ background: "#FFD700" }}
                        />

                        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-figtree), Figtree" }}>
                            {title}
                        </h2>
                        {description && (
                            <p className="text-sm text-muted-foreground mb-6">
                                {description}
                            </p>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-muted/50 border border-input rounded-lg px-4 py-3 pl-8 text-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                                    disabled={isLoading}
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">USDC</span>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    className={cn(
                                        "px-4 py-2 rounded-lg font-medium text-black transition-all flex items-center gap-2",
                                        isLoading || !amount || parseFloat(amount) <= 0
                                            ? "bg-muted cursor-not-allowed text-muted-foreground"
                                            : "bg-[#FFD700] hover:bg-[#FFD700]/90"
                                    )}
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {actionLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
