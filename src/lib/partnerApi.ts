const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

const authHeaders = (): HeadersInit => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
};

export type PartnerOrderMetadata = {
  /** id del mensajero asignado (puede venir como número o string) */
  delivery_assignee_id?: number | string | null;
  /** nombre del mensajero asignado */
  delivery_assignee_name?: string | null;
  /** extensible para futuros campos */
  [key: string]: unknown;
};

export type PartnerOrder = {
  id: number;
  created_at: string;
  status: 'paid' | 'shipped' | 'delivered';
  total: number;
  metadata?: PartnerOrderMetadata | null;
  customer_id: number | null;
  customer_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  owner_id?: number | null;
};

export async function listPartnerOrders(params: {
  status?: 'paid' | 'shipped' | 'delivered';
  scope?: 'mine' | 'available';
  page?: number;
  limit?: number;
}) {
  const qp = new URLSearchParams();
  if (params?.status) qp.set('status', params.status);
  if (params?.scope) qp.set('scope', params.scope);
  if (params?.page) qp.set('page', String(params.page));
  if (params?.limit) qp.set('limit', String(params.limit));

  const res = await fetch(`${API_URL}/partner/orders?${qp.toString()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) {
    return { items: [], page: 1, pages: 1, total: 0, limit: Number(params?.limit || 20) };
  }
  if (!res.ok) throw new Error('FETCH_ERROR');
  return res.json() as Promise<{
    items: PartnerOrder[];
    page: number;
    pages: number;
    total: number;
    limit: number;
  }>;
}

export async function partnerAssign(
  orderId: number,
  action: 'take' | 'release'
): Promise<{ ok: true }> {
  const res = await fetch(`${API_URL}/partner/orders/${orderId}/assign`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('FETCH_ERROR');
  return res.json() as Promise<{ ok: true }>;
}

export async function partnerSetStatus(
  orderId: number,
  status: 'shipped' | 'delivered'
): Promise<{ ok: true }> {
  const res = await fetch(`${API_URL}/partner/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('FETCH_ERROR');
  return res.json() as Promise<{ ok: true }>;
}
