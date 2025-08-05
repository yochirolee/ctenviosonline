import { getDictionary } from '@/lib/dictionaries'
import HeroSection from '../../components/HeroSection'
import AboutSection from '../../components/AboutSection'
import FAQSection from '../../components/FAQSection'
import Footer from '../../components/Footer'
import { getCollections, type Collection } from '@/lib/collections'
import type { Dict } from '@/types/Dict'

const IMAGE_MAP: Record<string, string> = {
  food: '/food.jpg',
  clothing: '/clothing.jpg',
  medicine: '/medicine.jpg',
  appliances: '/appliances.jpg',
  hygiene: '/higiene.webp',
  technology: '/tecnology.jpg',
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = (await getDictionary(locale)) as Dict
  const collections: Collection[] = await getCollections()

  const categories = collections
  .filter((c) => IMAGE_MAP[c.handle])
  .map((c) => ({
    slug: c.handle,
    image: IMAGE_MAP[c.handle],
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection dict={dict} categories={categories} />
      <AboutSection dict={dict} />
      <FAQSection dict={dict} />
      <Footer dict={dict} />
    </div>
  )
}
