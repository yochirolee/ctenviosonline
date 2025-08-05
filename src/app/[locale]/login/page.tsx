import { getDictionary } from '../../../lib/dictionaries'
import LoginRegisterPage from '../../../components/LoginRegisterPage'

type AuthDict = {
  login: {
    title: string
    email: string
    password: string
    submit: string
    success: string
    error: string
  }
  register: {
    title: string
    first_name: string
    last_name: string
    submit: string
    error: string
  }
  common: {
    loading: string
    required_fields?: string
    greeting: string
    login: string
    logout: string
    back: string
  }
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const fullDict = await getDictionary(locale) as unknown as AuthDict

  return <LoginRegisterPage dict={fullDict} locale={locale} />
}
