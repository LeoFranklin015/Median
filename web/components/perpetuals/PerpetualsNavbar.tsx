"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Search } from "lucide-react"
import { RainbowConnectButton } from "@/components/ConnectButton"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

const navLinks = [
  { name: "Trade", href: "/perpetuals" },
  { name: "Markets", href: "/markets" },
  { name: "Earn", href: "#" },
]

export function PerpetualsNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b",
        "bg-background/95 backdrop-blur-xl border-border"
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <Link
              href="/perpetuals"
              className="flex items-center gap-2 flex-shrink-0"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700" }}
              >
                M
              </span>
              <span
                className="font-semibold text-foreground hidden sm:inline"
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                Median
              </span>
            </Link>
            <div className="hidden md:block flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search markets"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                />
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  link.href === "/perpetuals"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:flex" />
            <div className="hidden sm:block [&_button]:!bg-muted [&_button]:!text-foreground [&_button]:!rounded-lg [&_button]:!text-sm [&_button]:!font-medium [&_button]:!px-4 [&_button]:!py-2">
              <RainbowConnectButton />
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              placeholder="Search markets"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted/50 text-foreground border border-border"
            />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-border flex items-center gap-3">
            <ThemeToggle />
            <div className="flex-1">
              <RainbowConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
