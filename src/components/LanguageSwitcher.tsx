'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  const currentLocale = pathname.split('/')[1] || 'en'
  const otherLocale = currentLocale === 'en' ? 'es' : 'en'

  const handleChange = () => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${otherLocale}`)
    router.push(newPath)
  }

  return (
    <button
      onClick={handleChange}
      className="block rounded-lg px-1 py-2 text-base font-semibold  text-gray-800 hover:bg-green-50 lg:px-0 lg:py-0 lg:rounded-none lg:bg-transparent lg:text-sm lg: text-gray-800 lg:hover:bg-transparent lg:hover:text-green-300"
    >
      {otherLocale.toUpperCase()}
    </button>
  )
}
