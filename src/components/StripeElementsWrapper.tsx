'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import React from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function StripeElementsWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  if (!stripePromise) return null

  return <Elements stripe={stripePromise}>{children}</Elements>
}
