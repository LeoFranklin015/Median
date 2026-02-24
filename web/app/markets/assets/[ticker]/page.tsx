import { PortfolioNavbar } from "@/components/PortfolioNavbar"

// import { notFound } from "next/navigation"
// import { AssetDetailView } from "@/components/markets/AssetDetailView"
// import { getAssetByTicker } from "@/lib/sparkline-data"

// type Props = {
//   params: Promise<{ ticker: string }>
// }

export default function AssetPage() {
  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <main className="pt-24 pb-16 flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-4">
          <h1
            className="text-5xl font-extrabold text-foreground"
            style={{ fontFamily: "Figtree, sans-serif" }}
          >
            Coming Soon
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto" style={{ fontFamily: "Figtree, sans-serif" }}>
            Asset details are under construction. Check back soon.
          </p>
        </div>
      </main>
    </div>
  )
}
