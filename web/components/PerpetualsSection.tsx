"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Zap, Shield, Clock } from "lucide-react"

type FeatureItem = {
  icon: React.ReactNode
  text: string
  delay: number
}

const features: FeatureItem[] = [
  {
    icon: <Zap className="w-4 h-4" />,
    text: "Real-time prices via Pyth Network",
    delay: 0,
  },
  {
    icon: <TrendingUp className="w-4 h-4" />,
    text: "Up to 10x leverage",
    delay: 0.1,
  },
  {
    icon: <Shield className="w-4 h-4" />,
    text: "No stock delivery, just profits",
    delay: 0.2,
  },
]

type MockTrade = {
  symbol: string
  price: string
  change: string
  isPositive: boolean
}

const mockTrades: MockTrade[] = [
  { symbol: "AAPL", price: "178.32", change: "+2.4%", isPositive: true },
  { symbol: "TSLA", price: "248.50", change: "-1.2%", isPositive: false },
  { symbol: "NVDA", price: "495.22", change: "+4.8%", isPositive: true },
  { symbol: "MSFT", price: "378.91", change: "+1.1%", isPositive: true },
]

export const PerpetualsSection = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    const element = document.getElementById("perpetuals-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % mockTrades.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isVisible])

  return (
    <section
      id="perpetuals-section"
      className="w-full overflow-hidden bg-secondary/30"
    >
      <div className="mx-auto max-w-7xl px-8 py-24">
        <div className="grid grid-cols-12 gap-8 items-center">
          {/* Left Content */}
          <div className="col-span-12 lg:col-span-6 order-2 lg:order-1 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.645, 0.045, 0.355, 1] }}
            >
              <div
                className="relative h-6 inline-flex items-center font-mono uppercase text-xs mb-8 px-3 py-1 rounded-full"
                style={{
                  fontFamily: "var(--font-geist-mono), 'Geist Mono', ui-monospace, monospace",
                  background: "rgba(20, 110, 150, 0.15)",
                  color: "#146e96",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  SYNTHETIC PERPS
                </span>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.645, 0.045, 0.355, 1] }}
              className="text-[48px] lg:text-[56px] font-medium leading-[1.1] tracking-tight text-foreground mb-6"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Go long. Go short.
              <br />
              <span className="text-muted-foreground">Never own the stock.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.645, 0.045, 0.355, 1] }}
              className="text-lg leading-7 text-muted-foreground mb-8 max-w-xl"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Perpetual futures on Apple, Tesla, Nvidia and more. Oracle-priced.
              Cash-settled. No expiry. Trade with up to 10x leverage — entirely in USDC.
            </motion.p>

            {/* Features List */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 + feature.delay,
                    ease: [0.645, 0.045, 0.355, 1],
                  }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255, 215, 0, 0.15)", color: "#FFD700" }}
                  >
                    {feature.icon}
                  </div>
                  <span
                    className="text-base text-foreground/80"
                    style={{ fontFamily: "var(--font-figtree), Figtree" }}
                  >
                    {feature.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Visual - Trading UI Mockup */}
          <div className="col-span-12 lg:col-span-6 order-1 lg:order-2 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.645, 0.045, 0.355, 1] }}
              className="relative w-full rounded-3xl overflow-hidden bg-background border border-foreground/10 shadow-2xl"
            >
              {/* Trading UI Header */}
              <div className="p-6 border-b border-foreground/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                      <span className="text-background font-bold text-sm">
                        {mockTrades[activeIndex].symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <motion.h3
                        key={activeIndex}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-lg font-semibold text-foreground"
                      >
                        {mockTrades[activeIndex].symbol}-PERP
                      </motion.h3>
                      <span className="text-xs text-muted-foreground">Perpetual</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.p
                      key={`price-${activeIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-2xl font-semibold text-foreground"
                    >
                      ${mockTrades[activeIndex].price}
                    </motion.p>
                    <motion.span
                      key={`change-${activeIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-sm font-medium ${
                        mockTrades[activeIndex].isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {mockTrades[activeIndex].change}
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="p-6 h-[200px] relative overflow-hidden">
                <svg
                  viewBox="0 0 400 150"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={isVisible ? { pathLength: 1 } : {}}
                    transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                    d="M0,100 Q50,80 100,90 T200,60 T300,70 T400,40"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="3"
                  />
                  <motion.path
                    initial={{ opacity: 0 }}
                    animate={isVisible ? { opacity: 1 } : {}}
                    transition={{ duration: 1, delay: 1.5 }}
                    d="M0,100 Q50,80 100,90 T200,60 T300,70 T400,40 V150 H0 Z"
                    fill="url(#chartGradient)"
                  />
                </svg>

                {/* Price indicator dot */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 2 }}
                  className="absolute right-6 top-1/4 w-3 h-3 bg-[#FFD700] rounded-full"
                  style={{ boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)" }}
                />
              </div>

              {/* Trading Actions */}
              <div className="p-6 border-t border-foreground/10 grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/10 text-green-500 font-medium transition-all hover:bg-green-500/20">
                  <TrendingUp className="w-4 h-4" />
                  Long
                </button>
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-500 font-medium transition-all hover:bg-red-500/20">
                  <TrendingDown className="w-4 h-4" />
                  Short
                </button>
              </div>

              {/* Leverage indicator */}
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Leverage</span>
                  <span className="text-[#FFD700] font-semibold">10x</span>
                </div>
                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={isVisible ? { width: "100%" } : {}}
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
