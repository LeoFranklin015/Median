"use client"

import { PerpetualsNavbar } from "@/components/perpetuals/PerpetualsNavbar"
import { PerpetualsTradeView } from "@/components/perpetuals/PerpetualsTradeView"

export default function PerpetualsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PerpetualsNavbar />
      <main className="pt-14">
        <PerpetualsTradeView />
      </main>
    </div>
  )
}
