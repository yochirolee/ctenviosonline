'use client'

import Image from 'next/image'
import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCart } from '@/context/CartContext'
import { checkCustomerAuth } from '@/lib/auth'
import type { ProductDetail, ProductOption, Variant } from '@/lib/products'

type Props = {
  product: ProductDetail // ← IMPORTANTE: ahora recibimos el detalle con options y variants
  locale: string
}

export default function ProductDetailClient({ product, locale }: Props) {
  const router = useRouter()
  const { addItem } = useCart()

  const options = (product.options || []).sort((a, b) => a.position - b.position)
  const variants = product.variants || []

  // Estado local de selección
  const [sel1, setSel1] = useState<string | null>(null)
  const [sel2, setSel2] = useState<string | null>(null)
  const [sel3, setSel3] = useState<string | null>(null)


  // Variante “seleccionada” (coincidencia exacta si ya se eligieron todas las opciones)
  const currentVariant: Variant | null = useMemo(() => {
    if (!options.length) return null
    // Si todas las opciones requeridas tienen valor, busca match exacto
    const need1 = options.find(o => o.position === 1)
    const need2 = options.find(o => o.position === 2)
    const need3 = options.find(o => o.position === 3)

    const hasAll =
      (!need1 || sel1) &&
      (!need2 || sel2) &&
      (!need3 || sel3)

    if (!hasAll) return null

    return variants.find(v =>
      (need1 ? v.option1 === sel1 : true) &&
      (need2 ? v.option2 === sel2 : true) &&
      (need3 ? v.option3 === sel3 : true) &&
      !v.archived &&
      (v.stock_qty ?? 0) > 0
    ) || null
  }, [options, variants, sel1, sel2, sel3])

  // === Precio dinámico ===
  function priceOfVariant(v?: Variant | null): number {
    if (!v) return product.price
    if (typeof v.display_total_usd === 'number') return v.display_total_usd
    if (v.price_with_margin_cents != null) return v.price_with_margin_cents / 100
  
    // acceso seguro sin any
    const dt = (v as Partial<Record<string, unknown>>).display_total_usd
    if (typeof dt === 'string') {
      const n = Number(dt)
      if (Number.isFinite(n)) return n
    }
    return product.price
  }
  

  const effectivePrice = priceOfVariant(currentVariant)

  // === Imagen dinámica con fallbacks robustos ===
  const firstVariantWithImage = useMemo(
    () => variants.find(v => (v.image_url || '').trim().length > 0)?.image_url ?? null,
    [variants]
  )

  const imageUrl =
    (currentVariant?.image_url && currentVariant.image_url.trim()) ||
    (product.imageSrc && product.imageSrc.trim()) ||
    (firstVariantWithImage && firstVariantWithImage.trim()) ||
    '/product.webp'

  const [imgSrc, setImgSrc] = useState<string>(imageUrl)

  // Sincroniza cuando cambie imageUrl (por cambio de variante, etc.)
  useEffect(() => {
    setImgSrc(imageUrl)
  }, [imageUrl])

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale === 'en' ? 'en' : 'es', { style: 'currency', currency: 'USD' }),
    [locale]
  )

  const handleAdd = async () => {
    const isLoggedIn = await checkCustomerAuth()
    if (!isLoggedIn) {
      toast.error(
        locale === 'en'
          ? 'You must be logged in to add products to your cart.'
          : 'Debes iniciar sesión para agregar productos a tu carrito.',
        { position: 'bottom-center' }
      )
      router.push(`/${locale}/login`)
      return
    }

    try {
      // pasa variant_id cuando exista:
      await addItem(Number(product.id), 1, currentVariant?.id)
      toast.success(
        locale === 'en' ? 'Product added to the cart' : 'Producto agregado al carrito',
        { position: 'bottom-center' }
      )
    } catch (e: unknown) {
      const err = (e ?? {}) as { code?: string; available?: number }
      if (err.code === 'OUT_OF_STOCK') {
        toast.error(
          locale === 'en'
            ? `Out of stock${Number.isFinite(err.available) ? ` (avail: ${err.available})` : ''}`
            : `Sin stock${Number.isFinite(err.available) ? ` (disp: ${err.available})` : ''}`,
          { position: 'bottom-center' }
        )
      } else {
        toast.error(
          locale === 'en'
            ? 'At the moment, you can’t add products to the cart.'
            : 'En este momento no se pueden agregar productos al carrito.',
          { position: 'bottom-center' }
        )
      }
    }
  }

  // helper para pintar selects
  const renderOption = (opt: ProductOption) => {
    const label = opt.name
    const value = opt.position === 1 ? sel1 : opt.position === 2 ? sel2 : sel3
    const setValue = opt.position === 1 ? setSel1 : opt.position === 2 ? setSel2 : setSel3

    // deshabilitar valores que no tengan variantes viables con el resto de selección
    const enabledSet = new Set(
      variants
        .filter(v => {
          if (opt.position !== 1 && sel1 && v.option1 !== sel1) return false
          if (opt.position !== 2 && sel2 && v.option2 !== sel2) return false
          if (opt.position !== 3 && sel3 && v.option3 !== sel3) return false
          return !v.archived && (v.stock_qty ?? 0) > 0
        })
        .map(v => (opt.position === 1 ? v.option1 : opt.position === 2 ? v.option2 : v.option3))
        .filter(Boolean) as string[]
    )

    return (
      <div key={opt.id} className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value || null)}
        >
          <option value="">
            {locale === 'en' ? 'Select an option' : 'Selecciona una opción'}
          </option>
          {opt.values.map(val => (
            <option key={val} value={val} disabled={!enabledSet.has(val)}>
              {val}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* IMAGEN */}
      <div className="rounded-xl border bg-white p-4">
        <div className="relative w-full h-[320px] md:h-[480px] lg:h-[560px]">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={product.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              priority
              unoptimized
              onError={() => setImgSrc('/product.webp')}
            />
          ) : (
            <img
              src="/product.webp"
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}
        </div>
      </div>


      {/* INFO */}
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

        {product.description && (
          <p className="text-gray-700 mt-3 whitespace-pre-line">{product.description}</p>
        )}

        {/* Selectores de variantes */}
        {options.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4">
            {options.map(renderOption)}
          </div>
        )}

        {/* Precio dinámico */}
        <div className="mt-6 text-2xl font-semibold text-green-700">
          {fmt.format(effectivePrice)}
        </div>

        <div className="mt-6">
          <button
            onClick={handleAdd}
            className="w-full bg-green-600 text-white text-base py-3 rounded-lg hover:bg-green-700 transition"
          >
            {locale === 'en' ? 'Add to Cart' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  )
}
