"use client"

import { PortfolioNavbar } from "@/components/PortfolioNavbar"
import { PerpetualsTradeView } from "@/components/perpetuals/PerpetualsTradeView"

export default function PerpetualsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <main className="pt-20">
        <PerpetualsTradeView />
      </main>
    </div>
  )
}
