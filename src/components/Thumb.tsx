'use client'
import Image from 'next/image'
import { useState } from 'react'

type Props = {
  src?: string | null
  alt?: string
  size?: number   // px (cuadrado)
  className?: string
  unoptimized?: boolean // si no configuras dominios en next.config.js
}

export default function Thumb({
  src,
  alt = 'Imagen',
  size = 56,
  className = '',
  unoptimized,
}: Props) {
  const [err, setErr] = useState(false)

  const boxCls =
    'relative overflow-hidden rounded border bg-white shadow-sm ' +
    'aspect-square ' +
    className

  // Si no hay src, placeholder
  if (!src) {
    return <div style={{ width: size, height: size }} className={boxCls} />
  }

  // Si el optimizer de Next falla, degradamos a <img> nativa (no desaparece)
  if (err) {
    return (
      <div style={{ width: size, height: size }} className={boxCls}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: 4,
            display: 'block',
          }}
        />
      </div>
    )
  }

  // Camino normal con next/image
  return (
    <div style={{ width: size, height: size }} className={boxCls}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-contain p-1"
        quality={85}
        onError={() => setErr(true)}
        unoptimized={unoptimized}
      />
    </div>
  )
}
