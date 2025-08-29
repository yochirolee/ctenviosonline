'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

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

function normalize(loc: any): DeliveryLocation | null {
  if (!loc || (loc.country !== 'US' && loc.country !== 'CU')) return null
  const out: DeliveryLocation = { country: loc.country }
  if (loc.country === 'CU') {
    out.province = typeof loc.province === 'string' ? loc.province : undefined
    out.municipality = typeof loc.municipality === 'string' ? loc.municipality : undefined
    out.area_type = loc.area_type === 'city' || loc.area_type === 'municipio' ? loc.area_type : undefined
  }
  // Si es US, limpia campos de CU
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
  const broadcast = (loc: DeliveryLocation | null) => {
    try { window.dispatchEvent(new CustomEvent('location:changed', { detail: loc })) } catch {}
  }

  const setLocation = (loc: DeliveryLocation) => {
    const normalized = normalize(loc)
    setLocationState(normalized)
    persist(normalized)
    broadcast(normalized)
  }

  // 🔧 Actualiza solo lo que necesitas (ideal para checkout)
  const updateLocation = (partial: Partial<DeliveryLocation>) => {
    setLocationState(prev => {
      const merged = normalize({ ...(prev || {}), ...partial }) || null
      persist(merged)
      broadcast(merged)
      return merged
    })
  }

  const clearLocation = () => {
    setLocationState(null)
    persist(null)
    broadcast(null)
  }

  const value = useMemo(() => ({ location, setLocation, updateLocation, clearLocation }), [location])
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export const useLocation = () => useContext(LocationContext)
