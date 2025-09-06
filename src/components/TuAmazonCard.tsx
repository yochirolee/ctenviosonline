'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TuAmazonCard() {
  const { locale } = useParams() as { locale: string }

  // Opciones:
  // const AMAZON_BG = '#007185' // Link blue (teal-azulado)
  // const AMAZON_BG = '#00A8E1' // Prime blue
  const AMAZON_BG_TOP = '#2F3F52'   // navy suavizado (top)
  const AMAZON_BG_BOTTOM = '#3F5168'// navy suavizado (bottom)

  return (
    <Link
      href={`/${locale}/amazon`}
      aria-label="Tu Amazon"
      className="group block border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
    >
      {/* Zona superior con gradiente más claro */}
      <div
        className="relative h-28 sm:h-32 md:h-36 lg:h-40"
        style={{
          background: `linear-gradient(180deg, ${AMAZON_BG_TOP} 0%, ${AMAZON_BG_BOTTOM} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-contain"
          style={{
            backgroundImage:
              "url('https://res.cloudinary.com/dz6nhejdd/image/upload/v1757163390/amazon_PNG13_eyld8b.png')",
          }}
        />
      </div>

      {/* Pie igual que las demás cards */}
      <div className="p-2 text-center bg-white">
        <h2 className="text-sm font-semibold text-gray-800 group-hover:text-green-600">
          Amazon
        </h2>
      </div>
    </Link>
  )
}
