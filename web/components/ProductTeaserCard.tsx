"use client"
import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
type ProductTeaserCardProps = {
  dailyVolume?: string
  dailyVolumeLabel?: string
  headline?: string
  subheadline?: string
  description?: string
  videoSrc?: string
  posterSrc?: string
  primaryButtonText?: string
  primaryButtonHref?: string
  secondaryButtonText?: string
  secondaryButtonHref?: string
}

// @component: ProductTeaserCard
export const ProductTeaserCard = (props: ProductTeaserCardProps) => {
  const {
    dailyVolume = "$2.4B",
    dailyVolumeLabel = "DAILY TRADING VOLUME",
    headline = "Settle Trades in Milliseconds",
    subheadline = "Traditional brokers settle in T+1. We settle in milliseconds using Yellow Network state channels — non-custodial, zero gas, instant execution.",
    description = "Powered by Pyth oracle prices and Circle's USDC, trade synthetic perpetuals with up to 10x leverage entirely on-chain.",
    // Use local TradingView-style candles video by default
    videoSrc = "/candles.mp4",
    posterSrc = "",
    primaryButtonText = "Launch App",
    primaryButtonHref = "",
    secondaryButtonText = "View Docs",
    secondaryButtonHref = "",
  } = props

  // @return
  return (
    <section className="w-full px-8 pt-32 pb-32 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.645, 0.045, 0.355, 1],
            }}
            className="col-span-12 lg:col-span-6 flex"
          >
            <div className="flex flex-col justify-center w-full">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.645, 0.045, 0.355, 1], delay: 0.5 }}
              className="flex flex-col gap-1 text-muted-foreground mb-8"
            >
              <span
                className="text-sm uppercase tracking-tight font-mono flex items-center gap-1"
                style={{
                  fontFamily: "var(--font-geist-mono), 'Geist Mono', ui-monospace, monospace",
                }}
              >
                {dailyVolumeLabel}
                <ArrowUpRight className="w-[0.71em] h-[0.71em]" />
              </span>
            </motion.div>

            <h1
              className="text-[56px] leading-[60px] tracking-tight text-foreground max-w-[520px] mb-6"
              style={{
                fontWeight: "500",
                fontFamily: "var(--font-figtree), Figtree",
              }}
            >
              {headline}
            </h1>

            <p
              className="text-lg leading-7 text-muted-foreground max-w-[520px] mb-6"
              style={{
                fontFamily: "var(--font-figtree), Figtree",
              }}
            >
              {subheadline}
            </p>

            <div className="max-w-[520px] mb-0">
              <p
                className="text-base leading-5"
                style={{
                  display: "none",
                }}
              >
                {description}
              </p>
            </div>

            <ul className="flex gap-1.5 flex-wrap mt-10">
              <li>
                <a
                  href={primaryButtonHref}
                  onClick={(e) => e.preventDefault()}
                  className="block cursor-pointer text-background bg-[#FFD700] rounded-full px-[18px] py-[15px] text-base leading-4 whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.455,0.03,0.515,0.955)] hover:rounded-2xl hover:bg-[#FFED4E]"
                  style={{
                    fontWeight: "500",
                  }}
                >
                  {primaryButtonText}
                </a>
              </li>
              <li>
                <a
                  href={secondaryButtonHref}
                  onClick={(e) => e.preventDefault()}
                  className="block cursor-pointer text-foreground border border-foreground rounded-full px-[18px] py-[15px] text-base leading-4 whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.455,0.03,0.515,0.955)] hover:rounded-2xl"
                >
                  {secondaryButtonText}
                </a>
              </li>
            </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.7,
              ease: [0.21, 0.8, 0.35, 1],
              delay: 0.15,
            }}
            className="col-span-12 lg:col-span-6 flex relative"
          >
            <div className="relative w-full aspect-[16/11]">
              {/* Video with edge fades to blend into black background */}
              <video
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                poster={posterSrc || undefined}
                className="h-full w-full object-cover"
                style={{
                  maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 50%, transparent 90%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 50%, transparent 90%)',
                }}
              />

              {/* Label */}
              <div className="absolute left-4 bottom-4 flex items-center gap-2 text-xs text-zinc-200/80 z-10">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-md">
                  Live candles preview
                </span>
                <span className="hidden sm:inline text-zinc-400">
                  Zoom, pan and trade directly in the app
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scrolling stock ticker */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 overflow-hidden border-y border-border/30"
        >
          <div className="relative py-6">
            {/* Gradient fades */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            {/* Ticker tape */}
            <div className="flex gap-12 animate-scroll-left whitespace-nowrap">
              {/* Duplicate the stocks array for seamless loop */}
              {[...STOCK_TICKERS, ...STOCK_TICKERS].map((stock, i) => (
                <div
                  key={`${stock.ticker}-${i}`}
                  className="flex items-center gap-3 flex-shrink-0"
                >
                  <img
                    src={`https://img.logokit.com/ticker/${stock.ticker}?token=pk_frfbe2dd55bc04b3d4d1bc`}
                    alt={stock.ticker}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{stock.ticker}</span>
                    <span className="text-xs text-muted-foreground">{stock.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const STOCK_TICKERS = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "GOOG", name: "Alphabet" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "PFE", name: "Pfizer" },
  { ticker: "INTC", name: "Intel" },
  { ticker: "SOFI", name: "SoFi" },
  { ticker: "OPEN", name: "Opendoor" },
  { ticker: "ONDS", name: "Ondas" },
  { ticker: "META", name: "Meta" },
  { ticker: "NFLX", name: "Netflix" },
  { ticker: "AMD", name: "AMD" },
  { ticker: "JPM", name: "JPMorgan" },
]
