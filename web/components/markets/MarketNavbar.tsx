"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Wallet, Search } from "lucide-react"

const navLinks = [
  { name: "Explore", href: "/markets" },
  { name: "Tools", href: "#" },
  { name: "Learn", href: "#" },
]

export function MarketNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/80">
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Q Search assets"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-100 border border-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors font-medium"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-sm font-medium transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
            <button
              type="button"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors"
            >
              Sign Up / Log In
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-zinc-900"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-200 px-4 py-4 space-y-3 bg-white">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search assets"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-zinc-100 text-zinc-900"
            />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-zinc-600 hover:text-zinc-900"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-zinc-200 space-y-2">
            <button
              type="button"
              className="flex items-center gap-2 w-full justify-center py-3 rounded-lg bg-zinc-200 text-zinc-900 text-sm font-medium"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
            <button
              type="button"
              className="flex items-center gap-2 w-full justify-center py-3 rounded-lg bg-zinc-900 text-white text-sm font-medium"
            >
              Sign Up / Log In
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
