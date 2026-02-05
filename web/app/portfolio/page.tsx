"use client"

import { PortfolioNavbar } from "@/components/PortfolioNavbar"
import { PortfolioView } from "@/components/portfolio/PortfolioView"

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <main className="pt-20">
        <PortfolioView />
      </main>
    </div>
  )
}
