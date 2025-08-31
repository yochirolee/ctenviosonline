'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocation, type DeliveryLocation } from '@/context/LocationContext'
import type { Dict } from '@/types/Dict'

const CUBA_PROVINCES = [
  'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas', 'Cienfuegos', 'Villa Clara',
  'Sancti Spíritus', 'Ciego de Ávila', 'Camagüey', 'Las Tunas', 'Holguín', 'Granma',
  'Santiago de Cuba', 'Guantánamo', 'Isla de la Juventud',
]

const MUNICIPIOS_CUBA: Record<string, string[]> = {
  'Pinar del Río': ['Pinar del Río', 'Consolación del Sur', 'Guane', 'La Palma', 'Los Palacios', 'Mantua', 'Minas de Matahambre', 'San Juan y Martínez', 'San Luis', 'Sandino', 'Viñales'],
  'Artemisa': ['Artemisa', 'Alquízar', 'Bauta', 'Caimito', 'Guanajay', 'Güira de Melena', 'Mariel', 'San Antonio de los Baños', 'Bahía Honda'],
  'La Habana': ['Playa', 'Plaza de la Revolución', 'Centro Habana', 'Habana Vieja', 'Regla', 'Habana del Este', 'Guanabacoa', 'San Miguel del Padrón', 'Diez de Octubre', 'Cerro', 'Marianao', 'La Lisa', 'Boyeros', 'Arroyo Naranjo', 'Cotorro'],
  'Mayabeque': ['San José de las Lajas', 'Batabanó', 'Bejucal', 'Güines', 'Jaruco', 'Madruga', 'Melena del Sur', 'Nueva Paz', 'Quivicán', 'San Nicolás de Bari', 'Santa Cruz del Norte'],
  'Matanzas': ['Matanzas', 'Cárdenas', 'Varadero', 'Colón', 'Jagüey Grande', 'Jovellanos', 'Limonar', 'Los Arabos', 'Martí', 'Pedro Betancourt', 'Perico', 'Unión de Reyes'],
  'Cienfuegos': ['Cienfuegos', 'Abreus', 'Aguada de Pasajeros', 'Cruces', 'Cumanayagua', 'Lajas', 'Palmira', 'Rodas'],
  'Villa Clara': ['Santa Clara', 'Caibarién', 'Camajuaní', 'Cifuentes', 'Corralillo', 'Encrucijada', 'Manicaragua', 'Placetas', 'Quemado de Güines', 'Ranchuelo', 'Remedios', 'Sagua la Grande', 'Santo Domingo'],
  'Sancti Spíritus': ['Sancti Spíritus', 'Cabaiguán', 'Fomento', 'Jatibonico', 'La Sierpe', 'Taguasco', 'Trinidad', 'Yaguajay'],
  'Ciego de Ávila': ['Ciego de Ávila', 'Baraguá', 'Bolivia', 'Chambas', 'Ciro Redondo', 'Florencia', 'Majagua', 'Morón', 'Primero de Enero', 'Venezuela'],
  'Camagüey': ['Camagüey', 'Carlos Manuel de Céspedes', 'Esmeralda', 'Florida', 'Guáimaro', 'Jimaguayú', 'Minas', 'Najasa', 'Nuevitas', 'Santa Cruz del Sur', 'Sibanicú', 'Sierra de Cubitas', 'Vertientes'],
  'Las Tunas': ['Las Tunas', 'Amancio', 'Colombia', 'Jesús Menéndez', 'Jobabo', 'Majibacoa', 'Manatí', 'Puerto Padre'],
  'Holguín': ['Holguín', 'Antilla', 'Báguanos', 'Banes', 'Cacocum', 'Calixto García', 'Cueto', 'Frank País', 'Gibara', 'Mayarí', 'Moa', 'Rafael Freyre', 'Sagua de Tánamo', 'Urbano Noris'],
  'Granma': ['Bayamo', 'Bartolomé Masó', 'Buey Arriba', 'Campechuela', 'Cauto Cristo', 'Guisa', 'Jiguaní', 'Manzanillo', 'Media Luna', 'Niquero', 'Pilón', 'Río Cauto', 'Yara'],
  'Santiago de Cuba': ['Santiago de Cuba', 'Contramaestre', 'Guamá', 'Mella', 'Palma Soriano', 'San Luis', 'Segundo Frente', 'Songo-La Maya', 'Tercer Frente'],
  'Guantánamo': ['Guantánamo', 'Baracoa', 'Caimanera', 'El Salvador', 'Imías', 'Maisí', 'Manuel Tames', 'Niceto Pérez', 'San Antonio del Sur', 'Yateras'],
  'Isla de la Juventud': ['Nueva Gerona', 'La Demajagua'],
}

function computeAreaType(prov: string, mun: string): 'city' | 'municipio' {
  const CAPITAL: Record<string, string> = {
    'Pinar del Río': 'Pinar del Río', 'Artemisa': 'Artemisa', 'La Habana': '',
    'Mayabeque': 'San José de las Lajas', 'Matanzas': 'Matanzas', 'Cienfuegos': 'Cienfuegos',
    'Villa Clara': 'Santa Clara', 'Sancti Spíritus': 'Sancti Spíritus', 'Ciego de Ávila': 'Ciego de Ávila',
    'Camagüey': 'Camagüey', 'Las Tunas': 'Las Tunas', 'Holguín': 'Holguín', 'Granma': 'Bayamo',
    'Santiago de Cuba': 'Santiago de Cuba', 'Guantánamo': 'Guantánamo', 'Isla de la Juventud': 'Nueva Gerona',
  }
  const capital = CAPITAL[prov] || ''
  return capital && mun === capital ? 'city' : 'municipio'
}

export default function BannerLocationPicker({ dict }: { dict: Dict }) {
  const { location, setLocation } = useLocation()
  const [open, setOpen] = useState(false)

  // abre si no hay location
  useEffect(() => { setOpen(location == null) }, [location])

  // drafts locales (solo para el diálogo)
  const [country, setCountry] = useState<'US' | 'CU'>('US')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')

  // ⚠️ Inicializamos los drafts SOLO cuando el modal se abre
  useEffect(() => {
    if (!open) return
    const c = location?.country ?? 'US'
    const p = location?.province ?? ''
    const m = location?.municipality ?? ''
    setCountry(c)
    setProvince(p)
    setMunicipality(m)
  }, [open, location])

  useEffect(() => {
    const onOpen = () => setOpen(true) // solo abrir, sin borrar
    window.addEventListener('location:open', onOpen)
    return () => {
      window.removeEventListener('location:open', onOpen)
    }
  }, [])

  const municipiosDeProv = useMemo(
    () => (province ? (MUNICIPIOS_CUBA[province] || []) : []),
    [province]
  )

  // Si cambia la provincia, limpiar municipio solo si dejó de ser válido
  useEffect(() => {
    if (!province) {
      if (municipality !== '') setMunicipality('')
      return
    }
    if (municipality && !municipiosDeProv.includes(municipality)) {
      setMunicipality('')
    }
  }, [province, municipiosDeProv, municipality])

  if (!open) return null

  const canSave =
    country === 'US' ||
    (country === 'CU' && province.trim() && municipality.trim())

  const onSave = () => {
    if (country === 'US') {
      const next: DeliveryLocation = { country: 'US' }
      setLocation(next)
      setOpen(false)
      return
    }
    const next: DeliveryLocation = {
      country: 'CU',
      province,
      municipality,
      area_type: computeAreaType(province, municipality),
    }
    setLocation(next)
    setOpen(false)
  }

  return (
    <div className="w-full bg-emerald-50 border-b border-emerald-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <div className="font-semibold text-emerald-800">{dict.location_banner.where_title}</div>
          <div className="text-sm text-emerald-700">
            {dict.location_banner.where_subtitle}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <select
            className="input"
            value={country}
            onChange={(e) => {
              const c = e.target.value as 'US' | 'CU'
              setCountry(c)
              if (c === 'US') { setProvince(''); setMunicipality('') }
            }}
          >
            <option value="US">{dict.location_banner.country_us}</option>
            <option value="CU">{dict.location_banner.country_cu}</option>
          </select>

          {country === 'CU' && (
            <>
              <select
                className="input"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                <option value="">{dict.location_banner.province_placeholder}</option>
                {CUBA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <select
                className="input"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                disabled={!province}
                required
              >
                <option value="">{dict.location_banner.municipality_placeholder}</option>
                {municipiosDeProv.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={!canSave}
              className={`px-3 py-2 rounded text-white ${canSave ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {dict.location_banner.save}
            </button>
            {location && (
              <button
                onClick={() => setOpen(true)}
                className="px-3 py-2 rounded bg-white border border-emerald-300 text-emerald-700"
                title="Cambiar ubicación"
              >
                {dict.location_banner.change}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
