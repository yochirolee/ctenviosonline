'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

export type DeliveryLocation = {
  country: 'US' | 'CU'
  province?: string
  municipality?: string
  area_type?: 'city' | 'municipio'
}

type LocationCtx = {
  location: DeliveryLocation | null
  setLocation: (loc: DeliveryLocation) => void
  updateLocation: (partial: Partial<DeliveryLocation>) => void
  clearLocation: () => void
}

const LocationContext = createContext<LocationCtx>({
  location: null,
  setLocation: () => {},
  updateLocation: () => {},
  clearLocation: () => {},
})

// 🔐 Versiona el storage para poder migrar en el futuro
const STORAGE_KEY_V2 = 'delivery_location_v2'
const LEGACY_KEYS = ['delivery_location'] // para migración

function normalize(loc: unknown): DeliveryLocation | null {
  if (typeof loc !== 'object' || loc === null) return null
  const l = loc as Record<string, unknown>

  const country = l.country === 'US' || l.country === 'CU' ? l.country : null
  if (!country) return null

  const out: DeliveryLocation = { country }

  if (country === 'CU') {
    out.province = typeof l.province === 'string' ? l.province : undefined
    out.municipality = typeof l.municipality === 'string' ? l.municipality : undefined
    out.area_type =
      l.area_type === 'city' || l.area_type === 'municipio'
        ? l.area_type
        : undefined
  }

  return out
}

function persist(loc: DeliveryLocation | null) {
  try {
    if (loc) localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(loc))
    else localStorage.removeItem(STORAGE_KEY_V2)
  } catch {}
}

function readPersisted(): DeliveryLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2)
    if (raw) return normalize(JSON.parse(raw))
    // 🔄 Migración desde legacy si existe
    for (const k of LEGACY_KEYS) {
      const legacy = localStorage.getItem(k)
      if (legacy) {
        const parsed = normalize(JSON.parse(legacy))
        if (parsed) {
          persist(parsed)
          try { localStorage.removeItem(k) } catch {}
          return parsed
        }
      }
    }
  } catch {}
  return null
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<DeliveryLocation | null>(null)

  useEffect(() => {
    setLocationState(readPersisted())
  }, [])

  // 🚨 Emite un evento para quien quiera escuchar cambios globales
  // Emisor de evento estable
const broadcast = useCallback((loc: DeliveryLocation | null) => {
  try {
    window.dispatchEvent(new CustomEvent('location:changed', { detail: loc }))
  } catch {}
}, [])

// setLocation estable
const setLocation = useCallback((loc: DeliveryLocation) => {
  const normalized = normalize(loc)
  setLocationState(normalized)
  persist(normalized)
  broadcast(normalized)
}, [broadcast])

// updateLocation estable
const updateLocation = useCallback((partial: Partial<DeliveryLocation>) => {
  setLocationState(prev => {
    const merged = normalize({ ...(prev || {}), ...partial }) || null
    persist(merged)
    broadcast(merged)
    return merged
  })
}, [broadcast])

// clearLocation estable
const clearLocation = useCallback(() => {
  setLocationState(null)
  persist(null)
  broadcast(null)
}, [broadcast])

// value con dependencias completas
const value = useMemo(
  () => ({ location, setLocation, updateLocation, clearLocation }),
  [location, setLocation, updateLocation, clearLocation]
)
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export const useLocation = () => useContext(LocationContext)
