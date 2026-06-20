// Service cek ongkir via RajaOngkir (Komerce).
// CATATAN: dipanggil langsung dari browser hanya untuk TES LOKAL.
// - API key di frontend tidak aman untuk produksi (pindahkan ke N8N nanti).
// - Komerce sering tidak mengirim header CORS → panggilan browser bisa diblokir.
//   Jika kena CORS, gunakan proxy (N8N) sebagai gantinya.

// Kita akan selalu gunakan proxy lokal (/ongkir-api) baik di dev maupun di production
// Di production, Caddy akan meneruskan request ini ke RajaOngkir.
const BASE = '/ongkir-api';

// Peringatan: API key di-ekspos di frontend! Harap waspada CORS dari Komerce.
const KEY = import.meta.env.VITE_RAJAONGKIR_KEY as string | undefined;

export const isOngkirConfigured = Boolean(KEY);

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

function ensureKey(): string {
  if (!KEY) {
    throw new Error('VITE_RAJAONGKIR_KEY belum diatur di .env');
  }
  return KEY;
}

/** Cari ID tujuan/asal berdasarkan nama kota/kecamatan. */
export async function searchDestination(query: string): Promise<OngkirDestination[]> {
  const key = ensureKey();
  const url = `${BASE}/destination/domestic-destination?search=${encodeURIComponent(query)}&limit=10&offset=0`;
  const res = await fetch(url, { headers: { key } });
  if (!res.ok) throw new Error(`Cari tujuan gagal (HTTP ${res.status})`);
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
  const key = ensureKey();
  const body = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    weight: String(params.weight),
    courier: params.courier,
  });
  const res = await fetch(`${BASE}/calculate/domestic-cost`, {
    method: 'POST',
    headers: { key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Hitung ongkir gagal (HTTP ${res.status})`);
  const json = await res.json();
  const rows = (json?.data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    courier: String(r.name ?? r.code ?? '').toUpperCase(),
    service: String(r.service ?? ''),
    description: String(r.description ?? ''),
    cost: Number(r.cost ?? 0),
    etd: String(r.etd ?? '-'),
  }));
}
