'use client'

import Image from 'next/image'
import PasteAmazonUrlBox from '@/components/PasteAmazonUrlBox'
import { ExternalLink, Clipboard, Link as LinkIcon, MousePointerClick, Smartphone } from 'lucide-react'
import BackButton from '@/components/BackButton'
import { useParams } from 'next/navigation'

export default function AmazonLanding() {
  // Colores “marca Amazon” más suaves
  const AMAZON_BG_TOP = '#2F3F52'
  const AMAZON_BG_BOTTOM = '#3F5168'
  const { locale } = useParams() as { locale: string }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-10">
      <BackButton
        label={locale === 'en' ? 'Back' : 'Atrás'}
        fallbackHref={`/${locale}#hero`}
      />
      {/* HERO con fondo Amazon */}
      <section
        className="relative overflow-hidden rounded-2xl border shadow-sm"
        style={{ background: `linear-gradient(180deg, ${AMAZON_BG_TOP} 0%, ${AMAZON_BG_BOTTOM} 100%)` }}
      >
        {/* Logo a la derecha (solo en pantallas grandes) */}
        <div
          className="
            pointer-events-none
            hidden lg:block
            absolute inset-y-0 right-0 w-1/2
            bg-right bg-no-repeat bg-contain opacity-20
          "
          style={{
            backgroundImage:
              "url('https://res.cloudinary.com/dz6nhejdd/image/upload/v1757163390/amazon_PNG13_eyld8b.png')",
          }}
          aria-hidden="true"
        />
        <div className="relative p-6 sm:p-8 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Tu Amazon</h1>
          <p className="mt-1 text-sm md:text-base text-white/90">
            Abre Amazon, copia el enlace del producto y pégalo aquí para continuar.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <a
              href="https://www.amazon.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-300 transition"
            >
              <ExternalLink size={16} />
              Abrir Amazon
            </a>
            <span className="text-xs text-white/80 hidden sm:inline">
              Consejo: agrega a favoritos para volver rápido.
            </span>
          </div>
        </div>
      </section>

      {/* Caja para pegar URL */}
      <section className="mt-6 rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
        <PasteAmazonUrlBox />
      </section>

      {/* Instrucciones + imágenes guía */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instrucciones (texto) */}
        <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">¿Cómo copio el enlace?</h2>

          {/* Desktop */}
          <div className="mt-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              <MousePointerClick size={14} />
              Computadora
            </div>
            <ol className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <LinkIcon className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                Abre el producto en Amazon y haz clic en la barra de direcciones.
              </li>
              <li className="flex items-start gap-2">
                <Clipboard className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                Copia el enlace completo (Ctrl/Cmd + C).
              </li>
              <li className="flex items-start gap-2">
                <MousePointerClick className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                Vuelve aquí y pégalo en el recuadro (Ctrl/Cmd + V).
              </li>
            </ol>
          </div>

          {/* Móvil */}
          <div className="mt-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              <Smartphone size={14} />
              Teléfono
            </div>
            <ol className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <LinkIcon className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                Abre el producto en la app o web de Amazon.
              </li>
              <li className="flex items-start gap-2">
                <Clipboard className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                Toca “Compartir” y elige “Copiar enlace”.
              </li>
              <li className="flex items-start gap-2">
                <MousePointerClick className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                Regresa y pégalo en el recuadro.
              </li>
            </ol>
          </div>

          <div className="mt-6 rounded-lg border border-dashed bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Tip: El enlace suele verse así:{' '}
            <code className="bg-white rounded px-1 py-0.5">https://www.amazon.com/dp/XXXXXXXXXX</code>
          </div>
        </div>

        {/* Imágenes guía (dos capturas) */}
        <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative w-full rounded-lg border bg-gray-50 overflow-hidden">
              <Image
                src="https://res.cloudinary.com/dz6nhejdd/image/upload/v1757165185/IMG_4485_uqrdxl.jpg"
                alt="Amazon: pantalla del producto con botón Compartir"
                width={900}
                height={1600}
                className="w-full h-auto object-contain"
                unoptimized
              />
            </div>
            <div className="relative w-full rounded-lg border bg-gray-50 overflow-hidden">
              <Image
                src="https://res.cloudinary.com/dz6nhejdd/image/upload/v1757165185/IMG_4484_jeivyo.jpg"
                alt="Amazon: hoja de compartir con opción Copy link"
                width={900}
                height={1600}
                className="w-full h-auto object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer sutil */}
      <div className="mt-8 text-center text-xs text-gray-500">
        Amazon es una marca registrada de sus respectivos propietarios.
      </div>
    </main>
  )
}
