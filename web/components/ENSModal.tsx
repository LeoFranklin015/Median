"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isUsernameAvailable, addMedianSubname } from "@/lib/ens";

interface ENSModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  onSuccess: (subname: string) => void;
}

export function ENSModal({ isOpen, onClose, address, onSuccess }: ENSModalProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check availability when username changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!username || username.length < 3) {
        setIsAvailable(null);
        return;
      }

      setIsCheckingAvailability(true);
      setError(null);

      try {
        const available = await isUsernameAvailable(username);
        setIsAvailable(available);
      } catch (err) {
        console.error("Error checking availability:", err);
        setError("Failed to check availability");
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    // Debounce the availability check
    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleRegister = async () => {
    if (!username || !isAvailable) return;

    const apiKey = process.env.NEXT_PUBLIC_JUSTA_NAME_API_KEY;
    if (!apiKey) {
      setError("API key not configured");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await addMedianSubname(username, address, apiKey);

      if (result.success && result.subname) {
        onSuccess(result.subname);
        onClose();
      } else {
        setError(result.error || "Failed to register subname");
      }
    } catch (err: any) {
      console.error("Error registering subname:", err);
      setError(err?.message || "Failed to register subname");
    } finally {
      setIsLoading(false);
    }
  };

  const isValidUsername = (name: string) => {
    // ENS subname validation: alphanumeric and hyphens, 3-63 characters
    return /^[a-z0-9-]{3,63}$/.test(name);
  };

  const canRegister = username && isAvailable && isValidUsername(username) && !isLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Glow effect */}
            <div
              className="absolute top-0 right-0 -m-20 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: "#FFD700" }}
            />

            <div className="relative p-6">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Claim Your Median.eth Name
                </h2>
                <p className="text-sm text-muted-foreground">
                  Get your free subname on median.eth to use across the platform
                </p>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Choose your username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="yourname"
                      className={cn(
                        "w-full px-4 py-3 bg-background border rounded-lg",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50",
                        "transition-all duration-200",
                        isAvailable === true && "border-green-500",
                        isAvailable === false && "border-red-500"
                      )}
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingAvailability && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {!isCheckingAvailability && isAvailable === true && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {!isCheckingAvailability && isAvailable === false && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Your ENS:</span>
                    <span className="font-mono text-foreground">
                      {username || "yourname"}.median.eth
                    </span>
                  </div>

                  {/* Validation Messages */}
                  {username && !isValidUsername(username) && (
                    <div className="flex items-start gap-2 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Use only lowercase letters, numbers, and hyphens (3-63 characters)</span>
                    </div>
                  )}

                  {isAvailable === false && (
                    <div className="flex items-start gap-2 text-sm text-red-500">
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>This username is already taken</span>
                    </div>
                  )}

                  {isAvailable === true && (
                    <div className="flex items-start gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>This username is available!</span>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                {/* Info Box */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">What you'll get:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your own ENS name on median.eth</li>
                    <li>• Works across all supported chains</li>
                    <li>• Free to claim, no gas fees</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg font-medium",
                    "bg-muted text-foreground",
                    "hover:bg-muted/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={!canRegister}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg font-medium",
                    "bg-[#FFD700] text-black",
                    "hover:bg-[#FFD700]/90 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                  {isLoading ? "Registering..." : "Claim Name"}
                </button>
              </div>

              {/* Address Info */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Registering for: {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
