import { notFound } from "next/navigation"
import { MarketNavbar } from "@/components/markets/MarketNavbar"
import { AssetDetailView } from "@/components/markets/AssetDetailView"
import { getAssetByTicker } from "@/lib/sparkline-data"

type Props = {
  params: Promise<{ ticker: string }>
}

export default async function AssetPage({ params }: Props) {
  const { ticker } = await params
  const asset = getAssetByTicker(ticker)

  if (!asset) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <MarketNavbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <AssetDetailView asset={asset} />
      </main>
    </div>
  )
}
