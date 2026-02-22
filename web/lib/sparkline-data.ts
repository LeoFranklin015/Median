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
  address?: string // ERC20 token address for this stock
  chainId?: number // Chain ID where this stock is deployed
}

export const ASSETS: AssetData[] = [
]

export function getAssetByTicker(ticker: string): AssetData | undefined {
  return ASSETS.find((a) => a.ticker.toLowerCase() === ticker.toLowerCase())
}
