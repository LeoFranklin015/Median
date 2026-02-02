import { PortfolioNavbar } from "@/components/PortfolioNavbar"
import { ProductTeaserCard } from "@/components/ProductTeaserCard"
import { WhyWeWinSection } from "@/components/WhyWeWinSection"
import { PerpetualsSection } from "@/components/PerpetualsSection"
import { OrderbookSection } from "@/components/OrderbookSection"
import { Footer } from "@/components/Footer"

export default function Page() {
  return (
    <>
      <PortfolioNavbar />
      <ProductTeaserCard />
      <WhyWeWinSection />
      <PerpetualsSection />
      <OrderbookSection />
      <Footer />
    </>
  )
}
