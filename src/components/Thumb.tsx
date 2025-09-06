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

  // marco cuadrado que NO deforma la imagen
  const boxCls =
    'relative overflow-hidden rounded border bg-white shadow-sm ' +
    'aspect-square ' + // mantiene cuadrado
    className

  if (!src || err) {
    return <div style={{ width: size, height: size }} className={boxCls} />
  }

  return (
    <div style={{ width: size, height: size }} className={boxCls}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-contain p-1"  // 👈 IMPORTANTE: contain + padding
        quality={85}
        onError={() => setErr(true)}
        unoptimized={unoptimized}      // usa true si aún no pusiste domains
      />
    </div>
  )
}
