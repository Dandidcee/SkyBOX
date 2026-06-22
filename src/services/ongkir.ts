// Service cek ongkir menggunakan Backend Node.js (Express) terpisah
// API Key aman di sisi server.

// Ubah URL ini melalui file .env jika backend dideploy ke production
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api/ongkir';

// Helper untuk ambil API Key dari localStorage
function getLocalApiKey() {
  return localStorage.getItem('RAJAONGKIR_KEY') || '';
}

export const isOngkirConfigured = true; // Akan divalidasi oleh backend jika key kosong

export interface OngkirDestination {
  id: string;
  label: string;
  province?: string;
  city?: string;
  subdistrict?: string;
  zip?: string;
}

export interface OngkirRate {
  courier: string;   // mis. "JNE"
  service: string;   // mis. "REG"
  description: string;
  cost: number;      // Rupiah
  etd: string;       // estimasi (mis. "2-3 hari")
}

/** Cari ID tujuan/asal berdasarkan nama kota/kecamatan. */
export async function searchDestination(query: string): Promise<OngkirDestination[]> {
  const url = `${BACKEND_URL}/destination?search=${encodeURIComponent(query)}`;
  const apiKey = getLocalApiKey();
  
  const res = await fetch(url, {
    headers: apiKey ? { 'x-api-key': apiKey } : undefined
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Gagal mencari tujuan (HTTP ${res.status})`);
  }
  
  const json = await res.json();
  const rows = (json?.data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    label: String(r.label ?? `${r.subdistrict_name ?? ''}, ${r.city_name ?? ''}`),
    province: r.province_name as string | undefined,
    city: r.city_name as string | undefined,
    subdistrict: r.subdistrict_name as string | undefined,
    zip: r.zip_code as string | undefined,
  }));
}

/** Hitung ongkir. courier contoh: "jne:sicepat:jnt" (dipisah titik dua). */
export async function checkCost(params: {
  origin: string;
  destination: string;
  weight: number; // gram
  courier: string;
}): Promise<OngkirRate[]> {
  const url = `${BACKEND_URL}/cost`;
  const apiKey = getLocalApiKey();
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Gagal menghitung ongkir (HTTP ${res.status})`);
  }
  
  const json = await res.json();
  const rows = (json?.data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    courier: String(r.code ?? r.name ?? '').toUpperCase(),
    service: String(r.service ?? ''),
    description: String(r.description ?? ''),
    cost: Number(r.cost ?? 0),
    etd: String(r.etd ?? '-'),
  }));
}

