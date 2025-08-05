'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'

type Dict = {
  categories: {
    title: string
    subtitle: string
    list: {
      food: string
      clothing: string
      medicine: string
      appliances: string
      hygiene: string
      technology: string
    }
  }
}

type Category = {
  slug: string
  image: string
}

type Props = {
  dict: Dict
  categories: Category[]
}

export default function HeroCategories({ dict, categories }: Props) {
  const { locale } = useParams() as { locale: string }

  return (
    <section className="py-8 px-4 md:px-12 lg:px-20 bg-white">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{dict.categories.title}</h1>
        <p className="text-gray-600 text-sm mt-1">{dict.categories.subtitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/${locale}/categories/${cat.slug}`}
            className="group block border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
          >
            <div className="relative h-28 sm:h-32 md:h-36 lg:h-40">
              <Image
                src={cat.image}
                alt={dict.categories.list[cat.slug as keyof typeof dict.categories.list]}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-2 text-center bg-white">
              <h2 className="text-sm font-semibold text-gray-800 group-hover:text-green-600">
                {dict.categories.list[cat.slug as keyof typeof dict.categories.list]}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
