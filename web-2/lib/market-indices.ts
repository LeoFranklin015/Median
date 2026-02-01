export type MarketIndex = {
  id: string
  name: string
  value: number
  change24h: number
  change24hPercent: number
}

export const MARKET_INDICES: MarketIndex[] = [
  { id: "0", name: "Average", value: 48892.47, change24h: -176.92, change24hPercent: -0.36 },
  { id: "1", name: "S&P 500", value: 5892.47, change24h: -21.18, change24hPercent: -0.36 },
  { id: "2", name: "NASDAQ Composite", value: 23461.82, change24h: -222.45, change24hPercent: -0.94 },
  { id: "3", name: "NYSE Composite", value: 22719.32, change24h: -154.67, change24hPercent: -0.68 },
  { id: "4", name: "CBOE Volatility Index", value: 17.44, change24h: 0.56, change24hPercent: 3.32 },
  { id: "5", name: "Treasury Yield 10Y", value: 4.24, change24h: 0.014, change24hPercent: 0.33 },
  { id: "6", name: "Dow Jones", value: 38512.34, change24h: -189.22, change24hPercent: -0.49 },
  { id: "7", name: "Russell 2000", value: 2167.89, change24h: -12.34, change24hPercent: -0.57 },
  { id: "8", name: "Gold Spot", value: 2689.45, change24h: 8.32, change24hPercent: 0.31 },
  { id: "9", name: "Crude Oil WTI", value: 72.18, change24h: -1.24, change24hPercent: -1.69 },
  { id: "10", name: "BTC/USD", value: 97234.56, change24h: 1245.32, change24hPercent: 1.3 },
]
