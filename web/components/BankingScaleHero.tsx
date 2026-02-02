"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
type StatItem = {
  value: string
  description: string
  delay: number
}
type DataPoint = {
  id: number
  left: number
  top: number
  height: number
  direction: "up" | "down"
  delay: number
}
const stats: StatItem[] = [
  {
    value: "<100ms",
    description: "Execution\nspeed",
    delay: 0,
  },
  {
    value: "$0",
    description: "Gas fees",
    delay: 0.2,
  },
  {
    value: "24/7",
    description: "Market hours",
    delay: 0.4,
  },
  {
    value: "100%",
    description: "Non-custodial",
    delay: 0.6,
  },
]
const generateDataPoints = (): DataPoint[] => {
  const points: DataPoint[] = []
  const baseLeft = 1
  const spacing = 32
  for (let i = 0; i < 50; i++) {
    const direction = i % 2 === 0 ? "down" : "up"
    const height = Math.floor(Math.random() * 120) + 88
    const top = direction === "down" ? Math.random() * 150 + 250 : Math.random() * 100 - 80
    points.push({
      id: i,
      left: baseLeft + i * spacing,
      top,
      height,
      direction,
      delay: i * 0.035,
    })
  }
  return points
}

// @component: BankingScaleHero
export const BankingScaleHero = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [dataPoints] = useState<DataPoint[]>(generateDataPoints())
  const [typingComplete, setTypingComplete] = useState(false)
  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(() => setTypingComplete(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // @return
  return (
    <div className="w-full overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-8 py-24 pt-16">
        <div className="grid grid-cols-12 gap-5 gap-y-16">
          <div className="col-span-12 md:col-span-6 relative z-10">
            <div
              className="relative h-6 inline-flex items-center font-mono uppercase text-xs text-[#167E6C] mb-12 px-2"
              style={{
                fontFamily: "var(--font-geist-mono), 'Geist Mono', ui-monospace, monospace",
              }}
            >
              <div className="flex items-center gap-0.5 overflow-hidden">
                <motion.span
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: "auto",
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  className="block whitespace-nowrap overflow-hidden text-accent relative z-10"
                  style={{
                    color: "#FFD700",
                  }}
                >
                  POWERED BY YELLOW NETWORK ↗
                </motion.span>
                <motion.span
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: typingComplete ? [1, 0, 1, 0] : 0,
                  }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="block w-1.5 h-3 bg-[#167E6C] ml-0.5 relative z-10 rounded-sm"
                  style={{
                    color: "#146e96",
                  }}
                />
              </div>
            </div>

            <h2
              className="text-[64px] font-normal leading-tight tracking-tight text-foreground mb-6"
              style={{
                fontFamily: "var(--font-figtree), Figtree",
                fontSize: "64px",
                fontWeight: "500",
              }}
            >
              Trade Stocks.
              <br />
              24/7. No Broker.
            </h2>

            <p
              className="text-lg leading-7 text-muted-foreground mt-0 mb-8 max-w-xl"
              style={{
                fontFamily: "var(--font-figtree), Figtree",
              }}
            >
              Synthetic perpetuals for AAPL, TSLA, and more — powered by Yellow state channels. Instant execution. Zero gas. Settle anywhere.
            </p>

            <div className="flex gap-4 mt-8">
              <button className="relative inline-flex justify-center items-center leading-5 text-center cursor-pointer whitespace-nowrap outline-none font-medium h-11 text-background bg-[#FFD700] transition-all duration-200 ease-in-out rounded-lg px-6 text-sm group hover:bg-[#FFED4E]">
                <span className="relative z-10 flex items-center gap-2">
                  Start Trading
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
                </span>
              </button>
              <button className="relative inline-flex justify-center items-center leading-5 text-center cursor-pointer whitespace-nowrap outline-none font-medium h-11 text-foreground border border-foreground/30 bg-transparent transition-all duration-200 ease-in-out rounded-lg px-6 text-sm group hover:border-foreground/50 hover:bg-foreground/5">
                <span className="relative z-10">View Markets</span>
              </button>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="relative w-full h-[416px] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.21, 0.8, 0.35, 1] }}
                className="relative w-full max-w-[720px] aspect-[16/9] rounded-3xl border border-zinc-800/70 bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden"
              >
                <video
                  src="/candles.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute left-4 bottom-4 flex items-center gap-3 text-xs text-zinc-200/80 font-medium">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Live candles
                  </span>
                  <span className="hidden sm:inline text-zinc-400">
                    Real-time price action preview • Zoom & pan enabled in app
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="col-span-12">
            <div className="overflow-visible pb-5">
              <div className="grid grid-cols-12 gap-5 relative z-10">
                {stats.map((stat, index) => (
                  <div key={index} className="col-span-6 md:col-span-3">
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 20,
                        filter: "blur(4px)",
                      }}
                      animate={
                        isVisible
                          ? {
                              opacity: [0, 1, 1],
                              y: [20, 0, 0],
                              filter: ["blur(4px)", "blur(0px)", "blur(0px)"],
                            }
                          : {}
                      }
                      transition={{
                        duration: 1.5,
                        delay: stat.delay,
                        ease: [0.1, 0, 0.1, 1],
                      }}
                      className="flex flex-col gap-2"
                    >
                      <span
                        className="text-2xl font-medium leading-[26.4px] tracking-tight text-[#167E6C]"
                        style={{
                          color: "#146e96",
                        }}
                      >
                        {stat.value}
                      </span>
                      <p className="text-xs leading-[13.2px] text-[#7C7F88] m-0 whitespace-pre-line">
                        {stat.description}
                      </p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
