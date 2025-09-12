// /lib/recipients.ts
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

const authHeaders = (): HeadersInit => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
};

export type RecipientCountry = "US" | "CU";

export type RecipientBase = {
  id: number;
  customer_id: number;
  country: RecipientCountry;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  label?: string | null;
  notes?: string | null;
  is_default?: boolean;
  instructions?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RecipientUSFields = {
  country: "US";
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip: string;
};

export type RecipientCUFields = {
  country: "CU";
  province: string;
  municipality: string;
  address: string;
  ci: string;
  area_type?: string | null;
};

export type RecipientUS = RecipientBase & RecipientUSFields;
export type RecipientCU = RecipientBase & RecipientCUFields;
export type Recipient = RecipientUS | RecipientCU;

// ===== Inputs =====
export type CreateRecipientUSInput = Omit<
  RecipientUS,
  "id" | "customer_id" | "created_at" | "updated_at"
>;

export type CreateRecipientCUInput = Omit<
  RecipientCU,
  "id" | "customer_id" | "created_at" | "updated_at"
>;

export type CreateRecipientInput = CreateRecipientUSInput | CreateRecipientCUInput;
export type UpdateRecipientUSInput = Partial<CreateRecipientUSInput>;
export type UpdateRecipientCUInput = Partial<CreateRecipientCUInput>;
export type UpdateRecipientInput = UpdateRecipientUSInput | UpdateRecipientCUInput;

// ===== API helpers =====
export async function listRecipients(): Promise<Recipient[]> {
  const res = await fetch(`${API_URL}/recipients`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("RECIPIENTS_LIST_FAILED");
  return res.json();
}

export async function getRecipient(id: number): Promise<Recipient> {
  const res = await fetch(`${API_URL}/recipients/${id}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("RECIPIENT_GET_FAILED");
  return res.json();
}

export async function createRecipient(input: CreateRecipientInput): Promise<Recipient> {
  const res = await fetch(`${API_URL}/recipients`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(msg || "RECIPIENT_CREATE_FAILED");
  }
  return res.json();
}

export async function updateRecipient(id: number, patch: UpdateRecipientInput): Promise<Recipient> {
  // backend acepta PUT o PATCH; usamos PATCH
  const res = await fetch(`${API_URL}/recipients/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(msg || "RECIPIENT_UPDATE_FAILED");
  }
  return res.json();
}

export async function deleteRecipient(id: number): Promise<{ ok: true }> {
  const res = await fetch(`${API_URL}/recipients/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(msg || "RECIPIENT_DELETE_FAILED");
  }
  return res.json();
}

/** Marca un destinatario como predeterminado del usuario */
export async function setDefaultRecipient(id: number): Promise<{ ok: true; id: number }> {
  const res = await fetch(`${API_URL}/recipients/${id}/default`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ is_default: true }),
  });
  if (!res.ok) {
    const msg = await safeErr(res);
    throw new Error(msg || "RECIPIENT_SET_DEFAULT_FAILED");
  }
  return res.json();
}

// ===== Utils =====
export function normalizeUSPhone(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  return d ? `+1${d.slice(-10)}` : "";
}

export function normalizeCUPhone(raw: string): string {
  const d = String(raw || "").replace(/\D/g, "");
  return d ? `+53${d}` : "";
}

async function safeErr(res: Response): Promise<string | null> {
  try {
    const txt = await res.text();
    const j = txt ? JSON.parse(txt) : null;
    const m = j && typeof j.message === "string" ? j.message : (j && typeof j.error === "string" ? j.error : null);
    return m;
  } catch {
    return null;
  }
}
