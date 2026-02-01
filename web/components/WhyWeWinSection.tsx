"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

type StatItem = {
  value: string
  label: string
  delay: number
}

type FallingBar = {
  id: number
  left: number
  height: number
  delay: number
  opacity: number
}

const stats: StatItem[] = [
  { value: "<100ms", label: "Execution", delay: 0 },
  { value: "$0", label: "Gas Fees", delay: 0.15 },
  { value: "24/7", label: "Market Hours", delay: 0.3 },
  { value: "100%", label: "Non-Custodial", delay: 0.45 },
]

const generateFallingBars = (): FallingBar[] => {
  const bars: FallingBar[] = []
  for (let i = 0; i < 24; i++) {
    bars.push({
      id: i,
      left: i * 20 + 10,
      height: Math.random() * 200 + 100,
      delay: i * 0.05,
      opacity: Math.random() * 0.5 + 0.3,
    })
  }
  return bars
}

export const WhyWeWinSection = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [bars] = useState<FallingBar[]>(generateFallingBars())

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    const element = document.getElementById("why-we-win-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="why-we-win-section"
      className="w-full overflow-hidden bg-background"
    >
      <div className="mx-auto max-w-7xl px-8 py-24">
        <div className="grid grid-cols-12 gap-8 items-center">
          {/* Left Content */}
          <div className="col-span-12 lg:col-span-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.645, 0.045, 0.355, 1] }}
            >
              <div
                className="relative h-6 inline-flex items-center font-mono uppercase text-xs mb-8 px-3 py-1 rounded-full"
                style={{
                  fontFamily: "var(--font-geist-mono), 'Geist Mono', ui-monospace, monospace",
                  background: "rgba(255, 215, 0, 0.1)",
                  color: "#FFD700",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full" />
                  BUILT DIFFERENT
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
              Settling trades in{" "}
              <span className="relative">
                <span
                  className="relative z-10"
                  style={{
                    background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  milliseconds
                </span>
                <span
                  className="absolute inset-0 blur-xl opacity-30"
                  style={{ background: "#FFD700" }}
                />
              </span>
              , not days — for traders who refuse to wait.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.645, 0.045, 0.355, 1] }}
              className="text-lg leading-7 text-muted-foreground mb-8 max-w-xl"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Traditional brokers settle in T+1. CEXs take your keys. We use Yellow Network
              state channels to give you instant, non-custodial trading with zero gas fees.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.645, 0.045, 0.355, 1] }}
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 text-[#FFD700] font-medium text-base group"
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                Learn how it works
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.645, 0.045, 0.355, 1] }}
              className="grid grid-cols-4 gap-6 mt-12 pt-8 border-t border-foreground/10"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay: 0.5 + stat.delay,
                    ease: [0.645, 0.045, 0.355, 1],
                  }}
                  className="flex flex-col gap-1"
                >
                  <span
                    className="text-2xl lg:text-3xl font-semibold tracking-tight"
                    style={{ color: "#146e96" }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Visual - Falling Bars */}
          <div className="col-span-12 lg:col-span-6 relative">
            <div className="relative w-full h-[400px] lg:h-[500px] overflow-hidden rounded-3xl bg-secondary/30">
              {/* Gradient Overlay */}
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)",
                }}
              />

              {/* Falling Bars Animation */}
              <div className="absolute inset-0 flex items-end justify-center">
                {bars.map((bar) => (
                  <motion.div
                    key={bar.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={
                      isVisible
                        ? {
                            height: bar.height,
                            opacity: bar.opacity,
                          }
                        : {}
                    }
                    transition={{
                      duration: 1.5,
                      delay: bar.delay,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    className="absolute bottom-0 w-3 rounded-t-sm"
                    style={{
                      left: `${bar.left}%`,
                      maxWidth: "12px",
                      background: `linear-gradient(180deg, rgba(20, 110, 150, 0.8) 0%, rgba(20, 110, 150, 0.2) 100%)`,
                    }}
                  />
                ))}
              </div>

              {/* Highlight effect */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isVisible ? { opacity: 1 } : {}}
                transition={{ duration: 1, delay: 0.8 }}
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
