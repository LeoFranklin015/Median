import Link from "next/link"
import { PortfolioNavbar } from "@/components/PortfolioNavbar"

export default function AssetNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <PortfolioNavbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
          Asset not found
        </h1>
        <p className="text-zinc-500 mb-6">
          The asset you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/markets"
          className="px-6 py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors"
        >
          Back to Explore
        </Link>
      </main>
    </div>
  )
}
