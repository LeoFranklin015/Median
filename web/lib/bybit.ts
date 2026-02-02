/**
 * Bybit API helpers for linear perpetuals.
 * REST: historical klines
 * WebSocket: wss://stream.bybit.com/v5/public/linear
 */

export const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear"
export const BYBIT_REST_URL = "https://api.bybit.com"

/** Map our ticker to Bybit symbol (linear perpetuals) */
export function tickerToBybitSymbol(ticker: string): string | null {
  const map: Record<string, string> = {
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    SOL: "SOLUSDT",
    DOGE: "DOGEUSDT",
    AVAX: "AVAXUSDT",
    LINK: "LINKUSDT",
    MATIC: "MATICUSDT",
    UNI: "UNIUSDT",
    ATOM: "ATOMUSDT",
    XRP: "XRPUSDT",
    ADA: "ADAUSDT",
    DOT: "DOTUSDT",
    LTC: "LTCUSDT",
    ARB: "ARBUSDT",
    OP: "OPUSDT",
    PEPE: "PEPEUSDT",
    WIF: "WIFUSDT",
    BONK: "BONKUSDT",
    SUI: "SUIUSDT",
    SEI: "SEIUSDT",
    APT: "APTUSDT",
    FIL: "FILUSDT",
    NEAR: "NEARUSDT",
    INJ: "INJUSDT",
    TIA: "TIAUSDT",
  }
  return map[ticker.toUpperCase()] ?? null
}

/** Map our timeframe labels to Bybit interval */
export function timeframeToBybitInterval(tf: string): string {
  const map: Record<string, string> = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    D: "D",
    W: "W",
    M: "M",
  }
  return map[tf] ?? "5"
}

export type OHLCData = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** Fetch historical klines from Bybit REST */
export async function fetchBybitKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<OHLCData[]> {
  const url = new URL(`${BYBIT_REST_URL}/v5/market/kline`)
  url.searchParams.set("category", "linear")
  url.searchParams.set("symbol", symbol)
  url.searchParams.set("interval", interval)
  url.searchParams.set("limit", String(limit))

  const res = await fetch(url.toString(), { cache: "no-store" })
  const json = await res.json()

  if (json.retCode !== 0) {
    throw new Error(json.retMsg ?? "Bybit API error")
  }

  const list = json.result?.list ?? []
  // list is [startTime, open, high, low, close, volume, turnover] reverse chrono
  const candles: OHLCData[] = [...list].reverse().map((row: string[]) => ({
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }))

  return candles
}
