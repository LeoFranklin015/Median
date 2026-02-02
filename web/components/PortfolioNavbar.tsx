"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { RainbowConnectButton } from "./ConnectButton"

const NAV_LINKS = [
  { name: "Markets", href: "/markets" },
  { name: "Perpetuals", href: "/perpetuals" },
  { name: "Contact us", href: "#contact" },
] as const

export const PortfolioNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMobileMenu = () => setIsMobileMenuOpen((open) => !open)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const handleAnchorClick = (href: string) => {
    if (!href.startsWith("#")) return
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border/60"
          : "bg-background/70 backdrop-blur-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors duration-200 flex items-center gap-2"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            <span
              style={{
                fontFamily: "Figtree",
                fontWeight: 800,
                color: "#FFD700",
                letterSpacing: "-0.02em",
              }}
            >
              Median
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
            <div 
              className="flex items-center gap-8 rounded-full px-8 py-3 backdrop-blur-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {NAV_LINKS.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-[15px] font-semibold text-zinc-300 hover:text-white transition-all duration-200 relative group whitespace-nowrap"
                    style={{ fontFamily: "Figtree, sans-serif", letterSpacing: "0.01em" }}
                  >
                    <span>{link.name}</span>
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-full" />
                  </Link>
                ) : (
                  <button
                    key={link.name}
                    type="button"
                    onClick={() => handleAnchorClick(link.href)}
                    className="text-[15px] font-semibold text-zinc-300 hover:text-white transition-all duration-200 relative group whitespace-nowrap"
                    style={{ fontFamily: "Figtree, sans-serif", letterSpacing: "0.01em" }}
                  >
                    <span>{link.name}</span>
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-full" />
                  </button>
                )
              )}
            </div>
          </div>

          {/* Right controls: theme + wallet */}
          <div className="hidden md:flex items-center gap-3">
            <div 
              className="rounded-full px-3 py-2 backdrop-blur-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <ThemeToggle />
            </div>
            <div 
              className="rounded-full px-3 py-1.5 backdrop-blur-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <div 
                className="[&_button]:!px-5 [&_button]:!py-2 [&_button]:!rounded-full [&_button]:!text-[15px] [&_button]:!font-semibold [&_button]:!bg-transparent [&_button]:!border-none [&_button]:!text-zinc-300 [&_button]:hover:!text-white [&_button]:!transition-colors"
                style={{ fontFamily: "Figtree, sans-serif" }}
              >
                <RainbowConnectButton />
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <div className="rounded-full bg-white/5 border border-white/10 px-1.5 py-1 backdrop-blur-xl mr-1">
              <ThemeToggle />
            </div>
            <button
              onClick={toggleMobileMenu}
              className="text-foreground hover:text-primary p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border"
          >
            <div className="px-6 py-4 space-y-3">
              {NAV_LINKS.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="block w-full text-left text-foreground hover:text-primary py-2.5 text-base font-medium"
                    style={{ fontFamily: "Figtree, sans-serif" }}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <button
                    key={link.name}
                    type="button"
                    onClick={() => {
                      handleAnchorClick(link.href)
                      closeMobileMenu()
                    }}
                    className="block w-full text-left text-foreground hover:text-primary py-2.5 text-base font-medium"
                    style={{ fontFamily: "Figtree, sans-serif" }}
                  >
                    {link.name}
                  </button>
                )
              )}
              <div className="pt-3 border-t border-border">
                <div className="rounded-2xl bg-white/5 border border-white/10 px-2 py-2 backdrop-blur-xl">
                  <div className="[&_button]:!w-full [&_button]:!justify-center [&_button]:!rounded-full">
                    <RainbowConnectButton />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

