'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminTabs from '@/components/admin/AdminTabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  getOwners,
  createOwner,
  updateOwner,
  updateOwnerShippingConfig,
  deleteOwner,
  type Owner,
  type ShippingConfig,
  type CuZoneKey,
  type CuBranch,
} from '@/lib/adminOwner';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

/** Provincias/Municipios Cuba (para disponibilidad) */
const PROVINCIAS_CUBA: Record<string, string[]> = {
  'Pinar del Río': ['Pinar del Río', 'Consolación del Sur', 'Guane', 'La Palma', 'Los Palacios', 'Mantua', 'Minas de Matahambre', 'San Juan y Martínez', 'San Luis', 'Sandino', 'Viñales'],
  'Artemisa': ['Artemisa', 'Alquízar', 'Bauta', 'Caimito', 'Guanajay', 'Güira de Melena', 'Mariel', 'San Antonio de los Baños', 'Bahía Honda'],
  'La Habana': ['Playa', 'Plaza de la Revolución', 'Centro Habana', 'Habana Vieja', 'Regla', 'Habana del Este', 'Guanabacoa', 'San Miguel del Padrón', 'Diez de Octubre', 'Cerro', 'Marianao', 'La Lisa', 'Boyeros', 'Arroyo Naranjo', 'Cotorro'],
  'Mayabeque': ['San José de las Lajas', 'Batabanó', 'Bejucal', 'Güines', 'Jaruco', 'Madruga', 'Melena del Sur', 'Nueva Paz', 'Quivicán', 'San Nicolás de Bari', 'Santa Cruz del Norte'],
  'Matanzas': ['Matanzas', 'Cárdenas', 'Varadero', 'Colón', 'Jagüey Grande', 'Jovellanos', 'Limonar', 'Los Arabos', 'Martí', 'Pedro Betancourt', 'Perico', 'Unión de Reyes'],
  'Cienfuegos': ['Cienfuegos', 'Abreus', 'Aguada de Pasajeros', 'Cruces', 'Cumanayagua', 'Lajas', 'Palmira', 'Rodas'],
  'Villa Clara': ['Santa Clara', 'Caibarién', 'Camajuaní', 'Cifuentes', 'Corralillo', 'Encrucijada', 'Manicaragua', 'Placetas', 'Quemado de Güines', 'Ranchuelo', 'Remedios', 'Sagua la Grande', 'Santo Domingo'],
  'Sancti Spíritus': ['Sancti Spíritus', 'Cabaiguán', 'Fomento', 'Jatibonico', 'La Sierpe', 'Taguasco', 'Trinidad', 'Yaguajay'],
  'Ciego de Ávila': ['Ciego de Ávila', 'Baraguá', 'Bolivia', 'Chambas', 'Ciro Redondo', 'Florencia', 'Majagua', 'Morón', 'Primero de Enero', 'Venezuela'],
  'Camagüey': ['Camagüey', 'Carlos Manuel de Céspedes', 'Esmeralda', 'Florida', 'Guaimaro', 'Jimaguayú', 'Minas', 'Najasa', 'Nuevitas', 'Santa Cruz del Sur', 'Sibanicú', 'Sierra de Cubitas', 'Vertientes'],
  'Las Tunas': ['Las Tunas', 'Amancio', 'Colombia', 'Jesús Menéndez', 'Jobabo', 'Majibacoa', 'Manatí', 'Puerto Padre'],
  'Holguín': ['Holguín', 'Antilla', 'Báguanos', 'Banes', 'Cacocum', 'Calixto García', 'Cueto', 'Frank País', 'Gibara', 'Mayarí', 'Moa', 'Rafael Freyre', 'Sagua de Tánamo', 'Urbano Noris'],
  'Granma': ['Bayamo', 'Bartolomé Masó', 'Buey Arriba', 'Campechuela', 'Cauto Cristo', 'Guisa', 'Jiguaní', 'Manzanillo', 'Media Luna', 'Niquero', 'Pilón', 'Río Cauto', 'Yara'],
  'Santiago de Cuba': ['Santiago de Cuba', 'Contramaestre', 'Guamá', 'Mella', 'Palma Soriano', 'San Luis', 'Segundo Frente', 'Songo-La Maya', 'Tercer Frente'],
  'Guantánamo': ['Guantánamo', 'Baracoa', 'Caimanera', 'El Salvador', 'Imías', 'Maisí', 'Manuel Tames', 'Niceto Pérez', 'San Antonio del Sur', 'Yateras'],
  'Isla de la Juventud': ['Nueva Gerona', 'La Demajagua'],
};

const CU_FIELDS: { label: string; key: CuZoneKey }[] = [
  { label: 'Habana (ciudad)', key: 'habana_city' },
  { label: 'Habana (municipio)', key: 'habana_municipio' },
  { label: 'Provincias (ciudad)', key: 'provincias_city' },
  { label: 'Provincias (municipio)', key: 'provincias_municipio' },
];

/* ========= Mini toasts ========= */
type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const remove = (id: number) => setToasts(ts => ts.filter(t => t.id !== id));
  const push = (type: Toast['type'], message: string, timeout = 4000) => {
    const id = idRef.current++;
    setToasts(ts => [...ts, { id, type, message }]);
    if (timeout > 0) setTimeout(() => remove(id), timeout);
  };
  return { toasts, push, remove };
}

/** Estado UI por provincia */
type ProvinceState = { all: boolean; selected: Set<string> };

export default function OwnersAdminPage() {
  const router = useRouter();

  const [owners, setOwners] = useState<Owner[]>([]);
  const [sel, setSel] = useState<Owner | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTariffs, setSavingTariffs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [areasLoading, setAreasLoading] = useState(false);
  const [cuAreas, setCuAreas] = useState<Record<string, ProvinceState>>({});

  const [cuTab, setCuTab] = useState<'sea' | 'air'>('sea');

  const { toasts, push, remove } = useToasts();

  const authHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const load = async () => {
    const data = await getOwners().catch(() => []);
    setOwners(Array.isArray(data) ? data : []);
    if (sel) {
      const refreshed = (data || []).find((o: Owner) => o.id === sel.id);
      if (refreshed) setSel(refreshed);
      else setSel(null);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const ownerId = sel?.id;
    if (!ownerId) {
      setCuAreas({});
      return;
    }
    let cancelled = false;

    const loadAreas = async () => {
      try {
        setAreasLoading(true);
        const res = await fetch(`${API_URL}/admin/owners/${ownerId}/areas?country=CU`, {
          headers: authHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('ERR');
        const rows: Array<{ province: string | null; municipality: string | null }> = await res.json();

        const next: Record<string, ProvinceState> = {};
        for (const prov of Object.keys(PROVINCIAS_CUBA)) {
          next[prov] = { all: false, selected: new Set() };
        }
        for (const row of rows) {
          const prov = row.province || '';
          const mun = row.municipality || null;
          if (!prov || !next[prov]) continue;
          if (mun === null) {
            next[prov].all = true;
            next[prov].selected.clear();
          } else if (!next[prov].all) {
            next[prov].selected.add(mun);
          }
        }
        if (!cancelled) setCuAreas(next);
      } catch {
        if (!cancelled) {
          const empty: Record<string, ProvinceState> = {};
          for (const prov of Object.keys(PROVINCIAS_CUBA)) {
            empty[prov] = { all: false, selected: new Set() };
          }
          setCuAreas(empty);
        }
      } finally {
        if (!cancelled) setAreasLoading(false);
      }
    };

    loadAreas();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.id]);

  const onSaveAreas = async () => {
    if (!sel?.id) return;
    const items: Array<{ country: 'CU'; province: string; municipality: string | null }> = [];
    for (const [prov, st] of Object.entries(cuAreas)) {
      if (st.all) items.push({ country: 'CU', province: prov, municipality: null });
      else if (st.selected.size > 0) {
        for (const m of Array.from(st.selected.values())) {
          items.push({ country: 'CU', province: prov, municipality: m });
        }
      }
    }
    try {
      const res = await fetch(`${API_URL}/admin/owners/${sel.id}/areas`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ country: 'CU', items }),
      });
      if (!res.ok) throw new Error('No se pudo guardar');
      push('success', 'Zonas de Cuba guardadas.');
    } catch {
      push('error', 'Error guardando zonas.');
    }
  };

  const onCreateOwner = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      push('error', 'Nombre y email son requeridos.');
      return;
    }
    const created = await createOwner({
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || undefined
    }).catch(() => {
      push('error', 'Error al crear owner.');
      return null;
    });
    if (created) {
      setNewName(''); setNewEmail(''); setNewPhone('');
      await load();
      setSel(created);
      push('success', 'Owner creado.');
    }
  };

  const onSaveProfile = async () => {
    if (!sel) return;
    if (!sel.name?.trim() || !sel.email?.trim()) {
      push('error', 'Nombre y email son requeridos.');
      return;
    }
    setSavingProfile(true);
    await updateOwner(sel.id, {
      name: sel.name.trim(),
      email: sel.email.trim(),
      phone: sel.phone?.trim() || null,
    })
      .then(() => { push('success', 'Perfil guardado.'); load(); })
      .catch(() => { push('error', 'Error guardando el perfil.'); })
      .finally(() => setSavingProfile(false));
  };

  const onDeleteOwner = async () => {
    if (!sel) return;
    const ok = window.confirm(`¿Eliminar el owner "${sel.name}"?`);
    if (!ok) return;
    setDeleting(true);
    await deleteOwner(sel.id)
      .then(() => { setSel(null); load(); push('success', 'Owner eliminado.'); })
      .catch(() => { push('error', 'No se pudo eliminar.'); })
      .finally(() => setDeleting(false));
  };

  /* ====== Helpers para editar shipping_config ====== */

  const bindSel = <K extends keyof Owner>(key: K, value: Owner[K]) =>
    setSel(s => (s ? ({ ...s, [key]: value }) : s));

  const ensureCfg = (s: Owner | null): ShippingConfig => ({ ...(s?.shipping_config || {}) });
  const ensureCu = (cfg: ShippingConfig) => ({ ...(cfg.cu || {}) });

  const ensureBranch = (cfg: ShippingConfig, t: 'sea'|'air'): CuBranch => {
    const cu = ensureCu(cfg);
    const branch = (cu[t] || {}) as CuBranch;
    return {
      mode: branch.mode,
      fixed: { ...(branch.fixed || {}) },
      by_weight: {
        rate_per_lb: branch.by_weight?.rate_per_lb,
        base: { ...(branch.by_weight?.base || {}) }
      },
      min_fee: branch.min_fee,
      over_weight_threshold_lbs: branch.over_weight_threshold_lbs,
      over_weight_fee: branch.over_weight_fee,
    };
  };

  const setCfg = (next: ShippingConfig) =>
    setSel(s => s ? ({ ...s, shipping_config: next }) : s);

  const setUsFixed = (val: number | undefined) => {
    const cfg = ensureCfg(sel);
    cfg.us = { ...(cfg.us || {}), fixed_usd: val };
    setCfg(cfg);
  };

  const setCuRestrict = (checked: boolean) => {
    const cfg = ensureCfg(sel);
    cfg.cu_restrict_to_list = checked;
    setCfg(cfg);
  };

  const setCuMode = (t: 'sea'|'air', mode: 'fixed'|'by_weight') => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    b.mode = mode;
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const setCuFixed = (t: 'sea'|'air', key: CuZoneKey, val?: number) => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    b.fixed = { ...(b.fixed || {}), [key]: val };
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const setCuRatePerLb = (t: 'sea'|'air', val?: number) => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    b.by_weight = { ...(b.by_weight || {}), rate_per_lb: val };
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const setCuMinFee = (t: 'sea'|'air', val?: number) => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    b.min_fee = val;
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const setCuBase = (t: 'sea'|'air', key: CuZoneKey, val?: number) => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    const base = { ...(b.by_weight?.base || {}), [key]: val };
    b.by_weight = { ...(b.by_weight || {}), base };
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const setCuOverThr = (t: 'sea'|'air', val?: number) => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    b.over_weight_threshold_lbs = val;
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const setCuOverFee = (t: 'sea'|'air', val?: number) => {
    const cfg = ensureCfg(sel);
    const cu = ensureCu(cfg);
    const b = ensureBranch(cfg, t);
    b.over_weight_fee = val;
    cu[t] = b;
    cfg.cu = cu;
    setCfg(cfg);
  };

  const onSaveTariffs = async () => {
    if (!sel) return;
    setSavingTariffs(true);
    const cfg: ShippingConfig = sel.shipping_config || {};
    await updateOwnerShippingConfig(sel.id, cfg)
      .then(() => { push('success', 'Tarifas guardadas.'); load(); })
      .catch(() => { push('error', 'Error guardando las tarifas.'); })
      .finally(() => setSavingTariffs(false));
  };

  const toastClass = useMemo(() => ({
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-gray-800 text-white',
  }), []);

  const toggleProvinceAll = (prov: string, checked: boolean) => {
    setCuAreas(prev => {
      const curr = prev[prov] || { all: false, selected: new Set<string>() };
      return {
        ...prev,
        [prov]: { all: checked, selected: checked ? new Set() : new Set(curr.selected) },
      };
    });
  };
  const toggleMunicipality = (prov: string, mun: string, checked: boolean) => {
    setCuAreas(prev => {
      const curr = prev[prov] || { all: false, selected: new Set<string>() };
      const nextSel = new Set(curr.selected);
      if (checked) nextSel.add(mun);
      else nextSel.delete(mun);
      return { ...prev, [prov]: { all: false, selected: nextSel } };
    });
  };

  const branch = (t: 'sea'|'air'): CuBranch | undefined =>
    sel?.shipping_config?.cu?.[t];

  const valNum = (v: unknown) => {
    if (v === null || v === undefined || v === '') return '';
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : '';
  };

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Owners & Tarifas de Envío</h1>
          <div className="flex gap-2">
            <button onClick={() => router.back()} className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => router.forward()} className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 inline-flex items-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AdminTabs />

        {/* TOASTS */}
        <div className="fixed right-4 top-4 z-50 space-y-2" role="region" aria-live="polite" aria-label="Notificaciones">
          {toasts.map(t => (
            <div key={t.id} className={`shadow-lg rounded px-4 py-3 flex items-start gap-3 ${toastClass[t.type]}`}>
              <div className="text-sm">{t.message}</div>
              <button onClick={() => remove(t.id)} className="ml-auto opacity-80 hover:opacity-100 text-sm">✕</button>
            </div>
          ))}
        </div>

        {/* Crear owner */}
        <div className="border rounded p-4 bg-white">
          <h2 className="font-semibold mb-3">Crear nuevo owner</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm">Nombre</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Email</label>
              <input className="input" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Teléfono (opcional)</label>
              <input className="input" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={onCreateOwner}>
              Crear owner
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Lista */}
          <div className="border rounded p-3 bg-white">
            <h2 className="font-semibold mb-2">Owners</h2>
            <ul className="divide-y">
              {owners.length === 0 && <li className="py-2 text-sm text-gray-500">No hay owners. Crea el primero arriba.</li>}
              {owners.map(o => (
                <li key={o.id} className="py-2 flex justify-between items-center">
                  <button className="underline" onClick={() => setSel(o)}>{o.name}</button>
                  <span className="text-xs text-gray-500">{o.email}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Editor */}
          <div className="md:col-span-2 border rounded p-3 bg-white">
            {!sel ? (
              <div className="text-gray-500">Selecciona un owner para editar su perfil y tarifas.</div>
            ) : (
              <div className="space-y-6">
                <h2 className="font-semibold">Editar: {sel.name}</h2>

                {/* PERFIL */}
                <div className="space-y-3">
                  <h3 className="font-medium">Perfil</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm">Nombre</label>
                      <input className="input" value={sel.name || ''} onChange={(e) => bindSel('name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm">Email</label>
                      <input className="input" value={sel.email || ''} onChange={(e) => bindSel('email', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm">Teléfono</label>
                      <input className="input" value={sel.phone || ''} onChange={(e) => bindSel('phone', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={savingProfile} onClick={onSaveProfile}>
                      {savingProfile ? 'Guardando…' : 'Guardar perfil'}
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50" disabled={deleting} onClick={onDeleteOwner}>
                      {deleting ? 'Eliminando…' : 'Eliminar owner'}
                    </button>
                  </div>
                </div>

                {/* TARIFAS */}
                <div className="space-y-4">
                  <h3 className="font-medium">Tarifas de Envío</h3>

                  {/* US fijo */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Estados Unidos</h4>
                    <label className="block text-sm">Tarifa fija (USD)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={valNum(sel.shipping_config?.us?.fixed_usd)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const v = raw === '' ? undefined : Number(raw);
                        setUsFixed(Number.isFinite(v as number) ? (v as number) : undefined);
                      }}
                    />
                  </div>

                  {/* Cuba tabs */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Cuba</h4>

                    <div className="inline-flex rounded-lg border overflow-hidden">
                      <button
                        className={`px-4 py-2 text-sm ${cuTab === 'sea' ? 'bg-green-600 text-white' : 'bg-white'}`}
                        onClick={() => setCuTab('sea')}
                      >
                        Barco
                      </button>
                      <button
                        className={`px-4 py-2 text-sm border-l ${cuTab === 'air' ? 'bg-green-600 text-white' : 'bg-white'}`}
                        onClick={() => setCuTab('air')}
                      >
                        Avión
                      </button>
                    </div>

                    {/* Modo */}
                    <div className="flex gap-4 mt-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={(branch(cuTab)?.mode || 'fixed') === 'fixed'}
                          onChange={() => setCuMode(cuTab, 'fixed')}
                        />
                        Fijo por zona
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={branch(cuTab)?.mode === 'by_weight'}
                          onChange={() => setCuMode(cuTab, 'by_weight')}
                        />
                        Calculado por peso
                      </label>
                    </div>

                    {/* Fijo */}
                    {(branch(cuTab)?.mode || 'fixed') === 'fixed' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {CU_FIELDS.map(({ label, key }) => (
                          <div key={key}>
                            <label className="block text-sm">{label} (USD)</label>
                            <input
                              className="input"
                              type="number"
                              step="0.01"
                              value={valNum(branch(cuTab)?.fixed?.[key])}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const v = raw === '' ? undefined : Number(raw);
                                setCuFixed(cuTab, key, Number.isFinite(v as number) ? (v as number) : undefined);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Por peso */}
                    {branch(cuTab)?.mode === 'by_weight' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm">Costo por libra (USD)</label>
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={valNum(branch(cuTab)?.by_weight?.rate_per_lb)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const v = raw === '' ? undefined : Number(raw);
                              setCuRatePerLb(cuTab, Number.isFinite(v as number) ? (v as number) : undefined);
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-sm">Mínimo a cobrar (USD)</label>
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={valNum(branch(cuTab)?.min_fee)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const v = raw === '' ? undefined : Number(raw);
                              setCuMinFee(cuTab, Number.isFinite(v as number) ? (v as number) : undefined);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {CU_FIELDS.map(({ label, key }) => (
                            <div key={key}>
                              <label className="block text-sm">Base {label} (USD)</label>
                              <input
                                className="input"
                                type="number"
                                step="0.01"
                                value={valNum(branch(cuTab)?.by_weight?.base?.[key])}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const v = raw === '' ? undefined : Number(raw);
                                  setCuBase(cuTab, key, Number.isFinite(v as number) ? (v as number) : undefined);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* NUEVOS: exceso de peso */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-sm">Umbral de exceso (lb)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          value={valNum(branch(cuTab)?.over_weight_threshold_lbs)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const v = raw === '' ? undefined : Number(raw);
                            setCuOverThr(cuTab, Number.isFinite(v as number) ? (v as number) : undefined);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm">Cargo por exceso (USD)</label>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          value={valNum(branch(cuTab)?.over_weight_fee)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const v = raw === '' ? undefined : Number(raw);
                            setCuOverFee(cuTab, Number.isFinite(v as number) ? (v as number) : undefined);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!sel.shipping_config?.cu_restrict_to_list}
                        onChange={(e) => setCuRestrict(e.target.checked)}
                      />
                      <span>Restringir catálogo en Cuba a las áreas listadas</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      disabled={savingTariffs}
                      onClick={onSaveTariffs}
                    >
                      {savingTariffs ? 'Guardando…' : 'Guardar tarifas'}
                    </button>
                  </div>
                </div>

                {/* DISPONIBILIDAD CUBA */}
                <div className="space-y-3">
                  <h3 className="font-medium">Disponibilidad de entrega en Cuba</h3>
                  <p className="text-sm text-gray-600">
                    Marca <b>provincia completa</b> o selecciona <b>municipios específicos</b>.
                  </p>

                  {areasLoading ? (
                    <div className="text-sm text-gray-500">Cargando…</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(PROVINCIAS_CUBA).map(([prov, municipalities]) => {
                        const st = cuAreas[prov] || { all: false, selected: new Set<string>() };
                        return (
                          <div key={prov} className="border rounded p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{prov}</div>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={st.all}
                                  onChange={(e) => toggleProvinceAll(prov, e.target.checked)}
                                />
                                Provincia completa
                              </label>
                            </div>

                            {!st.all && (
                              <div className="mt-2 max-h-48 overflow-auto pr-1">
                                {municipalities.map((mun) => (
                                  <label key={mun} className="flex items-center gap-2 text-sm py-0.5">
                                    <input
                                      type="checkbox"
                                      checked={st.selected.has(mun)}
                                      onChange={(e) => toggleMunicipality(prov, mun, e.target.checked)}
                                    />
                                    {mun}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-1">
                    <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={onSaveAreas}>
                      Guardar zonas Cuba
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
