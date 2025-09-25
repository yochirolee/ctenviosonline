import { getDictionary } from '@/lib/dictionaries'
import HeroSection from '../../components/HeroSection'
//import AboutSection from '../../components/AboutSection'
//import FAQSection from '../../components/FAQSection'
import Footer from '../../components/Footer'
import type { Dict } from '@/types/Dict'
import ProductsSpotlight from '@/components/ProductsSpotlight'
import BestSellers from '@/components/BestSellers'
import BestSellersPromo from '@/components/BestSellersPromo'
import ContinueAndBuyAgain from '@/components/ContinueAndBuyAgain'

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = (await getDictionary(locale)) as Dict

  return (
    <div className="flex flex-col min-h-screen">      
      <HeroSection dict={dict} />
      <BestSellersPromo />
      <ProductsSpotlight dict={dict} />
      <BestSellers dict={dict} />
      <ContinueAndBuyAgain dict={dict} />      
      <Footer dict={dict} />
    </div>
  )
}
