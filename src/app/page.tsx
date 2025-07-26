import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirige al idioma por defecto /en
  redirect('/en')
}