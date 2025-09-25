import { getDictionary } from '@/lib/dictionaries'
import HeroSection from '../../components/HeroSection'
//import AboutSection from '../../components/AboutSection'
//import FAQSection from '../../components/FAQSection'
import Footer from '../../components/Footer'
import type { Dict } from '@/types/Dict'
import ProductsSpotlight from '@/components/ProductsSpotlight'
import BestSellers from '@/components/BestSellers'

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
      <ProductsSpotlight dict={dict} />
      <BestSellers dict={dict} />
      
      <Footer dict={dict} />
    </div>
  )
}
