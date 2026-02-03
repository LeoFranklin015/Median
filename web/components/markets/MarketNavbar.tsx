"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Search, Wallet } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useYellowNetwork } from "@/lib/yellowNetwork/YellowNetworkContext"
import { useAccount } from "wagmi"

const navLinks = [
  { name: "Trade", href: "/perpetuals" },
  { name: "Explore", href: "/markets" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Tools", href: "#" },
  { name: "Learn", href: "#" },
]

export function MarketNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { connect, isConnected, isAuthenticated } = useYellowNetwork()
  const { address } = useAccount()

  const handleConnect = async () => {
    await connect()
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const isWalletConnected = isConnected && isAuthenticated && address

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link href="/markets" className="flex items-center gap-2 flex-shrink-0">
              <span className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-medium">
                @
              </span>
            </Link>
            <div className="hidden md:block flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Q Search assets"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-muted focus:bg-background"
                />
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex">
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={handleConnect}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-colors"
            >
              <Wallet className="w-4 h-4" />
              {isWalletConnected ? formatAddress(address!) : "Connect Wallet"}
            </button>
            {!isWalletConnected && (
              <button
                type="button"
                onClick={handleConnect}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors"
              >
                Sign Up / Log In
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border px-4 py-4 space-y-3 bg-background">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted text-foreground"
            />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-zinc-200 space-y-2">
            <button
              type="button"
              onClick={handleConnect}
              className="flex items-center gap-2 w-full justify-center py-3 rounded-lg bg-muted text-foreground text-sm font-medium"
            >
              <Wallet className="w-4 h-4" />
              {isWalletConnected ? formatAddress(address!) : "Connect Wallet"}
            </button>
            {!isWalletConnected && (
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-center gap-2 w-full justify-center py-3 rounded-lg bg-zinc-900 text-white text-sm font-medium"
              >
                Sign Up / Log In
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
