import { getDictionary } from '@/lib/dictionaries'
import HeroSection from '../../components/HeroSection'
import AboutSection from '../../components/AboutSection'
import FAQSection from '../../components/FAQSection'
import Footer from '../../components/Footer'
import type { Dict } from '@/types/Dict'

const IMAGE_MAP = {
  food: '/food.jpg',
  clothing: '/clothing.jpg',
  medicine: '/medicine.jpg',
  appliances: '/appliances.jpg',
  hygiene: '/higiene.webp',
  technology: '/tecnology.jpg',
}

const CATEGORIES = Object.keys(IMAGE_MAP).map((key) => ({
  slug: key,
  image: IMAGE_MAP[key as keyof typeof IMAGE_MAP],
}))

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = (await getDictionary(locale)) as Dict

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection dict={dict} categories={CATEGORIES} />
      <AboutSection dict={dict} />
      <FAQSection dict={dict} />
      <Footer dict={dict} />
    </div>
  )
}
