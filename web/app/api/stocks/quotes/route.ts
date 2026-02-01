import { NextResponse } from "next/server"
import { fetchQuotes } from "@/lib/finnhub"
import { ASSETS } from "@/lib/sparkline-data"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get("symbols")
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim())
    : ASSETS.map((a) => a.ticker)

  try {
    const quotes = await fetchQuotes(symbols)
    return NextResponse.json(quotes)
  } catch (error) {
    console.error("Failed to fetch quotes:", error)
    return NextResponse.json(
      { error: "Failed to fetch stock quotes" },
      { status: 500 }
    )
  }
}
