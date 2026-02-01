/** Generate deterministic mock sparkline data - trending down (negative) or up (positive) */
function generateSparkline(
  basePrice: number,
  changePercent: number,
  points = 24,
  seed = 0
): number[] {
  const data: number[] = []
  const totalChange = basePrice * (changePercent / 100)
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const noise = Math.sin((i + seed) * 2.1) * 0.008 + Math.cos((i + seed) * 1.3) * 0.005
    const price = basePrice - totalChange * (1 - t) + basePrice * noise
    data.push(Math.max(price, 0.01))
  }
  return data
}

export type AssetData = {
  id: string
  ticker: string
  name: string
  price: number
  change24h: number
  change24hPercent: number
  sparklineData: number[]
  icon: string
  iconBg: string
  category: string
  categories: string[]
  marketCap?: string
  addedDate?: string // "2 days ago", "1 week ago" for Newly Added
}

export const ASSETS: AssetData[] = [
  {
    id: "1",
    ticker: "SLV",
    name: "iShares Silver Trust",
    price: 76.87,
    change24h: -28.17,
    change24hPercent: -26.82,
    sparklineData: generateSparkline(105, -26.82, 24, 1),
    icon: "SLV",
    iconBg: "bg-orange-100 text-orange-700",
    category: "ETF",
    categories: ["ETF", "Large Cap"],
    marketCap: "$12.4B",
  },
  {
    id: "2",
    ticker: "NVDA",
    name: "NVIDIA",
    price: 190.13,
    change24h: -12.45,
    change24hPercent: -6.14,
    sparklineData: generateSparkline(202.5, -6.14, 24, 2),
    icon: "NV",
    iconBg: "bg-emerald-100 text-emerald-700",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$4.7T",
  },
  {
    id: "3",
    ticker: "PLUG",
    name: "Plug Power",
    price: 2.14,
    change24h: -0.89,
    change24hPercent: -29.38,
    sparklineData: generateSparkline(3.03, -29.38, 24, 3),
    icon: "PL",
    iconBg: "bg-blue-100 text-blue-700",
    category: "Technology",
    categories: ["Technology", "Growth"],
    marketCap: "$1.2B",
  },
  {
    id: "4",
    ticker: "SOFI",
    name: "SoFi Technologies",
    price: 22.78,
    change24h: -1.24,
    change24hPercent: -5.17,
    sparklineData: generateSparkline(24, -5.17, 24, 4),
    icon: "SF",
    iconBg: "bg-teal-100 text-teal-700",
    category: "Financials",
    categories: ["Financials", "Growth"],
    marketCap: "$18.5B",
  },
  {
    id: "5",
    ticker: "VZ",
    name: "Verizon",
    price: 44.59,
    change24h: 1.82,
    change24hPercent: 4.26,
    sparklineData: generateSparkline(42.77, 4.26, 24, 5),
    icon: "VZ",
    iconBg: "bg-red-100 text-red-700",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Value"],
    marketCap: "$187B",
  },
  {
    id: "6",
    ticker: "INTC",
    name: "Intel",
    price: 46.38,
    change24h: -2.14,
    change24hPercent: -4.41,
    sparklineData: generateSparkline(48.5, -4.41, 24, 6),
    icon: "IN",
    iconBg: "bg-blue-100 text-blue-800",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Value"],
    marketCap: "$195B",
  },
  {
    id: "7",
    ticker: "AAPL",
    name: "Apple",
    price: 232.45,
    change24h: 3.21,
    change24hPercent: 1.4,
    sparklineData: generateSparkline(229.24, 1.4, 24, 7),
    icon: "AP",
    iconBg: "bg-zinc-100 text-zinc-800",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$3.6T",
  },
  {
    id: "8",
    ticker: "SPY",
    name: "SPDR S&P 500 ETF",
    price: 612.34,
    change24h: -8.92,
    change24hPercent: -1.43,
    sparklineData: generateSparkline(621.26, -1.43, 24, 8),
    icon: "SP",
    iconBg: "bg-indigo-100 text-indigo-700",
    category: "ETF",
    categories: ["ETF", "Large Cap"],
    marketCap: "$612B",
  },
  {
    id: "9",
    ticker: "TSLA",
    name: "Tesla",
    price: 388.12,
    change24h: -15.67,
    change24hPercent: -3.88,
    sparklineData: generateSparkline(403.79, -3.88, 24, 9),
    icon: "TS",
    iconBg: "bg-rose-100 text-rose-700",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$1.2T",
  },
  {
    id: "10",
    ticker: "JPM",
    name: "JPMorgan Chase",
    price: 245.89,
    change24h: 4.32,
    change24hPercent: 1.79,
    sparklineData: generateSparkline(241.57, 1.79, 24, 10),
    icon: "JP",
    iconBg: "bg-cyan-100 text-cyan-800",
    category: "Financials",
    categories: ["Financials", "Large Cap", "Value"],
    marketCap: "$455B",
  },
  {
    id: "11",
    ticker: "AMZN",
    name: "Amazon",
    price: 214.56,
    change24h: 2.89,
    change24hPercent: 1.37,
    sparklineData: generateSparkline(211.67, 1.37, 24, 11),
    icon: "AM",
    iconBg: "bg-amber-100 text-amber-700",
    category: "Consumer",
    categories: ["Consumer", "Large Cap", "Growth"],
    marketCap: "$2.2T",
  },
  {
    id: "12",
    ticker: "MSFT",
    name: "Microsoft",
    price: 456.78,
    change24h: -5.23,
    change24hPercent: -1.13,
    sparklineData: generateSparkline(462, -1.13, 24, 12),
    icon: "MS",
    iconBg: "bg-sky-100 text-sky-700",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$3.4T",
  },
  {
    id: "13",
    ticker: "GOOGL",
    name: "Alphabet (Google)",
    price: 189.34,
    change24h: 1.45,
    change24hPercent: 0.77,
    sparklineData: generateSparkline(187.89, 0.77, 24, 13),
    icon: "GO",
    iconBg: "bg-violet-100 text-violet-700",
    category: "Technology",
    categories: ["Technology", "Large Cap", "Growth"],
    marketCap: "$3.3T",
  },
  {
    id: "14",
    ticker: "WMT",
    name: "Walmart",
    price: 72.15,
    change24h: 0.89,
    change24hPercent: 1.25,
    sparklineData: generateSparkline(71.26, 1.25, 24, 14),
    icon: "WM",
    iconBg: "bg-blue-100 text-blue-600",
    category: "Consumer",
    categories: ["Consumer", "Large Cap", "Value"],
    marketCap: "$390B",
  },
  {
    id: "15",
    ticker: "QQQ",
    name: "Invesco QQQ Trust",
    price: 567.89,
    change24h: -6.42,
    change24hPercent: -1.12,
    sparklineData: generateSparkline(574.31, -1.12, 24, 15),
    icon: "QQ",
    iconBg: "bg-fuchsia-100 text-fuchsia-700",
    category: "ETF",
    categories: ["ETF", "Technology", "Large Cap"],
    marketCap: "$312B",
  },
]

// Mark some as newly added for the Newly Added column
ASSETS[10].addedDate = "2 days ago" // AMZN
ASSETS[11].addedDate = "3 days ago" // MSFT
ASSETS[12].addedDate = "5 days ago" // GOOGL
ASSETS[13].addedDate = "1 week ago" // WMT
ASSETS[14].addedDate = "1 week ago" // QQQ

export function getAssetByTicker(ticker: string): AssetData | undefined {
  return ASSETS.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase())
}
