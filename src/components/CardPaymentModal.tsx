'use client'

import { useMemo, useState } from 'react'

type CardPaymentModalDict = {
  title: string
  total_label: string
  disclaimer: string
  fields: {
    card_number: string
    month: string
    year: string
    cvv: string
    zip: string
    name_on_card: string
    name_on_card_placeholder: string
  }
  placeholders: {
    card_number: string
    month: string
    year: string
    cvv3: string
    cvv4: string
    zip: string
  }
  actions: {
    cancel: string
    pay_now: string
    processing: string
  }
  errors: {
    card_number_invalid: string
    month_invalid: string
    year_invalid: string
    year_expired: string
    expired: string
    cvv_len: string
    cvv_len_amex: string
    zip_invalid: string
    name_required: string
  }
}

type Props = {
  open: boolean
  amountLabel?: string
  onClose: () => void
  onSubmit: (p: {
    cardNumber: string
    expMonth: string
    expYear: string
    cvn: string
    zipCode: string
    nameOnCard: string
  }) => Promise<void> | void
  loading?: boolean
  dict: CardPaymentModalDict
}

type Errors = Partial<Record<'cardNumber'|'expMonth'|'expYear'|'cvn'|'zip'|'name', string>>

export default function CardPaymentModal({
  open,
  amountLabel,
  onClose,
  onSubmit,
  loading,
  dict,
}: Props) {
  // state
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvn, setCvn] = useState('')
  const [zip, setZip] = useState('')
  const [name, setName] = useState('')
  const [touched, setTouched] = useState<{[k:string]: boolean}>({})
  const [currentErrors, setCurrentErrors] = useState<Errors>({})

  // helpers
  const onlyDigits = (s:string) => s.replace(/\D+/g, '')
  const formatCard = (s:string) => onlyDigits(s).slice(0,19).replace(/(.{4})/g,'$1 ').trim()

  const detectBrand = (digits: string) => {
    if (/^4/.test(digits)) return 'Visa'
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'Mastercard'
    if (/^3[47]/.test(digits)) return 'Amex'
    if (/^6(?:011|5)/.test(digits)) return 'Discover'
    if (/^3(?:0[0-5]|[68])/.test(digits)) return 'Diners'
    return null
  }

  const luhn = (digits: string) => {
    let sum = 0, alt = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits.charAt(i), 10)
      if (alt) { n *= 2; if (n > 9) n -= 9 }
      sum += n
      alt = !alt
    }
    return sum % 10 === 0
  }

  const validate = (): Errors => {
    const errs: Errors = {}

    const digits = onlyDigits(cardNumber)
    if (digits.length < 13 || digits.length > 19 || !luhn(digits)) {
      errs.cardNumber = dict.errors.card_number_invalid
    }

    const mm = onlyDigits(expMonth)
    const yy = onlyDigits(expYear)
    const mmNum = Number(mm)
    if (mm.length !== 2 || mmNum < 1 || mmNum > 12) {
      errs.expMonth = dict.errors.month_invalid
    }

    if (yy.length !== 2) {
      errs.expYear = dict.errors.year_invalid
    } else {
      const now = new Date()
      const yNow2 = Number(String(now.getFullYear()).slice(-2))
      const mNow  = now.getMonth() + 1
      const yyNum = Number(yy)
      const withinWindow = (candidate: number) => {
        const delta = (candidate - yNow2 + 100) % 100
        return delta <= 20
      }
      if (!withinWindow(yyNum)) {
        errs.expYear = dict.errors.year_expired
      } else if (yyNum === yNow2 && Number(mm) < mNow) {
        errs.expMonth = dict.errors.expired
      }
    }

    const cvnDigits = onlyDigits(cvn)
    const brand = detectBrand(digits)
    const need4 = brand === 'Amex'
    if (cvnDigits.length < 3 || cvnDigits.length > 4) {
      errs.cvn = need4 ? dict.errors.cvv_len_amex : dict.errors.cvv_len
    } else if (need4 && cvnDigits.length !== 4) {
      errs.cvn = dict.errors.cvv_len_amex
    }

    const zipDigits = onlyDigits(zip)
    if (zipDigits.length < 3 || zipDigits.length > 10) {
      errs.zip = dict.errors.zip_invalid
    }

    if (!name.trim()) {
      errs.name = dict.errors.name_required
    }

    return errs
  }

  // memos
  const brand = useMemo(() => detectBrand(onlyDigits(cardNumber)), [cardNumber])

  // helpers UI
  const markTouched = (k: keyof Errors) => setTouched(t => ({ ...t, [k]: true }))
  const showError = (k: keyof Errors) => touched[k] && currentErrors[k]

  const handleBlur = (k: keyof Errors) => {
    markTouched(k)
    setCurrentErrors(validate())
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allTouched: {[k in keyof Errors]: boolean} = {
      cardNumber: true, expMonth: true, expYear: true, cvn: true, zip: true, name: true
    }
    setTouched(prev => ({ ...prev, ...allTouched }))
    const errs = validate()
    setCurrentErrors(errs)
    if (Object.keys(errs).length > 0) return

    await onSubmit({
      cardNumber: onlyDigits(cardNumber),
      expMonth: onlyDigits(expMonth).padStart(2,'0'),
      expYear: onlyDigits(expYear).slice(-2).padStart(2,'0'),
      cvn: onlyDigits(cvn),
      zipCode: onlyDigits(zip),
      nameOnCard: name.trim(),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !loading && onClose()}
      />
      <div className="relative z-[101] w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">{dict.title}</h3>
          {amountLabel && <p className="text-sm text-gray-600">{dict.total_label} {amountLabel}</p>}
          <p className="mt-1 text-xs text-gray-500">{dict.disclaimer}</p>
        </div>

        <form onSubmit={submit} noValidate autoComplete="on" className="space-y-3">
          <div>
            <label className="block text-sm">{dict.fields.card_number}</label>
            <div className="relative">
              <input
                inputMode="numeric"
                autoComplete="cc-number"
                className={`input w-full pr-20 ${showError('cardNumber') ? 'border-red-500' : ''}`}
                placeholder={dict.placeholders.card_number}
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                onBlur={() => handleBlur('cardNumber')}
                required
                maxLength={23}
                aria-invalid={!!showError('cardNumber')}
                autoFocus
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {brand || ''}
              </span>
            </div>
            {showError('cardNumber') && (
              <p className="mt-1 text-xs text-red-600">{currentErrors.cardNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm">{dict.fields.month}</label>
              <input
                inputMode="numeric"
                autoComplete="cc-exp-month"
                className={`input w-full ${showError('expMonth') ? 'border-red-500' : ''}`}
                placeholder={dict.placeholders.month}
                value={expMonth}
                onChange={(e) => setExpMonth(onlyDigits(e.target.value).slice(0,2))}
                onBlur={() => handleBlur('expMonth')}
                required
                aria-invalid={!!showError('expMonth')}
              />
              {showError('expMonth') && (
                <p className="mt-1 text-xs text-red-600">{currentErrors.expMonth}</p>
              )}
            </div>
            <div>
              <label className="block text-sm">{dict.fields.year}</label>
              <input
                inputMode="numeric"
                autoComplete="cc-exp-year"
                className={`input w-full ${showError('expYear') ? 'border-red-500' : ''}`}
                placeholder={dict.placeholders.year}
                value={expYear}
                onChange={(e) => setExpYear(onlyDigits(e.target.value).slice(0,2))}
                onBlur={() => handleBlur('expYear')}
                required
                aria-invalid={!!showError('expYear')}
              />
              {showError('expYear') && (
                <p className="mt-1 text-xs text-red-600">{currentErrors.expYear}</p>
              )}
            </div>
            <div>
              <label className="block text-sm">{dict.fields.cvv}</label>
              <input
                inputMode="numeric"
                autoComplete="cc-csc"
                className={`input w-full ${showError('cvn') ? 'border-red-500' : ''}`}
                placeholder={brand === 'Amex' ? dict.placeholders.cvv4 : dict.placeholders.cvv3}
                value={cvn}
                onChange={(e) => setCvn(onlyDigits(e.target.value).slice(0,4))}
                onBlur={() => handleBlur('cvn')}
                required
                aria-invalid={!!showError('cvn')}
              />
              {showError('cvn') && (
                <p className="mt-1 text-xs text-red-600">{currentErrors.cvn}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">{dict.fields.zip}</label>
              <input
                inputMode="numeric"
                autoComplete="postal-code"
                className={`input w-full ${showError('zip') ? 'border-red-500' : ''}`}
                placeholder={dict.placeholders.zip}
                value={zip}
                onChange={(e) => setZip(onlyDigits(e.target.value).slice(0,10))}
                onBlur={() => handleBlur('zip')}
                required
                aria-invalid={!!showError('zip')}
              />
              {showError('zip') && (
                <p className="mt-1 text-xs text-red-600">{currentErrors.zip}</p>
              )}
            </div>
            <div>
              <label className="block text-sm">{dict.fields.name_on_card}</label>
              <input
                autoComplete="cc-name"
                className={`input w-full ${showError('name') ? 'border-red-500' : ''}`}
                placeholder={dict.fields.name_on_card_placeholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                required
                aria-invalid={!!showError('name')}
              />
              {showError('name') && (
                <p className="mt-1 text-xs text-red-600">{currentErrors.name}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={!!loading}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              {dict.actions.cancel}
            </button>
            <button
              type="submit"
              disabled={!!loading}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? dict.actions.processing : dict.actions.pay_now}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
