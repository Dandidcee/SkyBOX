// Klien Supabase untuk frontend SkyBox.
// Hanya memakai ANON key (dibatasi RLS). service_role tidak pernah ada di frontend.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True bila env Supabase lengkap. Dipakai App untuk menampilkan layar error konfigurasi. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Instance klien Supabase (null bila env belum dikonfigurasi).
 * Komponen sebaiknya memakai guard `isSupabaseConfigured` sebelum memakai klien.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Mengembalikan klien atau melempar error bila belum dikonfigurasi. */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env'
    );
  }
  return supabase;
}
