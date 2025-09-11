'use client'

import { useEffect, useState } from 'react'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminTabs from '@/components/admin/AdminTabs'
import { getPayoutsReport, closeOwnerPayout, type PayoutRow, type PayoutResponse, listOwners, type Owner } from '@/lib/adminApi'
import { toast } from 'sonner' // NEW (si ya usas sonner en el proyecto)
function usd(n: number) {
  return (n / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export default function AdminPayoutsReportPage() {
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [deliveredOnly, setDeliveredOnly] = useState(true)
  const [includePaid, setIncludePaid] = useState(false)
  const [data, setData] = useState<PayoutResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false) // NEW
  const [err, setErr] = useState<string | null>(null)

  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerId, setOwnerId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const os = await listOwners();
        setOwners(os);
      } catch {
        /* opcional: toast.error('No se pudieron cargar owners') */
      }
    })();
  }, []);

  const load = async () => {
    setLoading(true); setErr(null)
    try {
      const r = await getPayoutsReport({
        from, to,
        delivered_only: deliveredOnly,
        include_paid: includePaid,
        owner_id: ownerId ?? undefined, // si no hay selección, no filtra por owner
      });
      setData(r)
    } catch {
      setErr('No se pudo cargar el reporte')
    } finally {
      setLoading(false)
    }
  }

  
  useEffect(() => { void load() }, []) // primera carga

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Reporte de pagos a owners</h1>
        <AdminTabs />

        {/* Filtros */}
        {/* Filtros (visual refresh) */}
        <div className="bg-white rounded-xl border shadow-sm p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Desde */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Hasta */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Owner ID */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Req Cerrar Lote</label>
              <select
                className="input"
                value={ownerId ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setOwnerId(v === '' ? null : Number(v));
                }}
              >
                <option value="">— Todos (solo para ver reporte) —</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.name ?? 'Sin nombre'}
                  </option>
                ))}
              </select>
            </div>


            {/* Toggle: Solo entregadas */}
            <div className="md:col-span-3 flex items-end">
              <label className="group inline-flex items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={deliveredOnly}
                  onChange={(e) => setDeliveredOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative w-11 h-6 rounded-full bg-gray-200 transition-colors
                         peer-checked:bg-emerald-600">
                  <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow
                           transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-sm text-gray-700">Solo entregadas</span>
              </label>
            </div>

            {/* Toggle: Incluir ya pagadas */}
            <div className="md:col-span-3 flex items-end">
              <label className="group inline-flex items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={includePaid}
                  onChange={(e) => setIncludePaid(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative w-11 h-6 rounded-full bg-gray-200 transition-colors
                         peer-checked:bg-emerald-600">
                  <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow
                           transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-sm text-gray-700">Incluir órdenes ya pagadas</span>
              </label>
            </div>

            {/* Acciones */}
            <div className="md:col-span-12 flex flex-col md:flex-row items-stretch md:items-end justify-end gap-2 pt-2">
              <button
                onClick={load}
                className="inline-flex justify-center px-4 h-10 rounded-lg border border-gray-300 bg-white
                   text-gray-800 hover:bg-gray-50 transition"
              >
                Aplicar
              </button>

              <button
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60"
                disabled={closing || ownerId === null}
                onClick={async () => {
                  if (ownerId === null) {
                    toast.error('Selecciona un owner para cerrar el lote');
                    return;
                  }
                  try {
                    setClosing(true);
                    const resp = await closeOwnerPayout({
                      from, to,
                      delivered_only: deliveredOnly,
                      owner_id: ownerId, // <-- requerido
                      note: `Cierre desde UI ${from}..${to} owner=${ownerId}`,
                    });
                    if (resp.ok) {
                      toast.success(`Lote #${resp.payout?.id ?? '–'} creado. Órdenes: ${resp.orders.length}`);
                      await load();
                    } else {
                      toast.error('No se pudo cerrar el lote');
                    }
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'No se pudo cerrar el lote');
                  } finally {
                    setClosing(false);
                  }
                }}
              >
                {closing ? 'Cerrando…' : 'Cerrar lote'}
              </button>

            </div>
          </div>
        </div>


        {loading && <div className="p-4">Cargando…</div>}
        {err && <div className="p-4 text-red-600">{err}</div>}

        {/* Tabla */}
        {data && (
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-right">Órdenes</th>
                  <th className="px-3 py-2 text-right">Items</th>
                  <th className="px-3 py-2 text-right">Base (owner)</th>
                  <th className="px-3 py-2 text-right">Envío (owner)</th>
                  <th className="px-3 py-2 text-right">Owner Total</th>
                  <th className="px-3 py-2 text-right">Fee pasarela</th>
                  <th className="px-3 py-2 text-right">Impuestos</th>
                  <th className="px-3 py-2 text-right">Margen bruto</th>
                  <th className="px-3 py-2 text-right">Margen neto</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: PayoutRow) => (
                  <tr key={r.owner_id} className="border-t">
                    <td className="px-3 py-2">{r.owner_id} — {r.owner_name}</td>
                    <td className="px-3 py-2 text-right">{r.orders_count}</td>
                    <td className="px-3 py-2 text-right">{r.items_count}</td>
                    <td className="px-3 py-2 text-right">{usd(r.base_cents)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.shipping_owner_cents)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.owner_total_cents_without_tax)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.gateway_fee_cents)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.tax_cents)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.margin_cents)}</td>
                    <td className="px-3 py-2 text-right">{usd(r.platform_net_margin_cents)}</td>
                  </tr>
                ))}
              </tbody>

              {/* FOOTER CORREGIDO: mismo orden que el thead */}
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td className="px-3 py-2 font-semibold">Totales</td>
                  <td className="px-3 py-2 text-right font-semibold">{data.totals.orders_count}</td>
                  <td className="px-3 py-2 text-right font-semibold">{data.totals.items_count}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.base_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.shipping_owner_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.owner_total_cents_without_tax)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.gateway_fee_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.tax_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.margin_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{usd(data.totals.platform_net_margin_cents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}
