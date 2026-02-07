const FINNHUB_BASE = "https://finnhub.io/api/v1"

export type FinnhubQuote = {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price of the day
  l: number // Low price of the day
  o: number // Open price of the day
  pc: number // Previous close price
  t?: number // Timestamp
}

export type FinnhubCandles = {
  c: number[] // Close
  h: number[] // High
  l: number[] // Low
  o: number[] // Open
  s: string // Status
  t: number[] // Timestamp
  v: number[] // Volume
}

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not set in environment variables")
  }
  return key
}

export async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  const token = getApiKey()
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return null
  const data = await res.json()
  if (data.c === 0 && data.d === 0 && data.dp === 0) return null
  return data
}

export async function fetchQuotes(
  symbols: string[]
): Promise<Record<string, FinnhubQuote | null>> {
  const results: Record<string, FinnhubQuote | null> = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      results[symbol] = await fetchQuote(symbol)
    })
  )
  return results
}

const RESOLUTION_SECONDS: Record<string, number> = {
  "1": 60,
  "5": 300,
  "15": 900,
  "30": 1800,
  "60": 3600,
  D: 86400,
  W: 604800,
  M: 2592000,
}

export async function fetchCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M" = "D",
  count = 30
): Promise<FinnhubCandles | null> {
  const token = getApiKey()
  const to = Math.floor(Date.now() / 1000)
  const interval = RESOLUTION_SECONDS[resolution] ?? 86400
  const from = to - count * interval
  const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${token}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.c || data.c.length === 0) return null
  return data
}
