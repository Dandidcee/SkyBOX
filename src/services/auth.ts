// Service autentikasi admin (Supabase Auth).
// Admin dibuat manual di dashboard Supabase (Authentication > Users). Tidak ada signup publik.
// Login memakai email + password; session disimpan otomatis oleh supabase-js (localStorage).

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/** Ambil session aktif (null bila belum login). */
export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

/** User yang sedang login (null bila belum login). */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user;
}

/** Login dengan email + password. Melempar error bila gagal. */
export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('Login gagal: session tidak ditemukan.');
  return data.session;
}

/** Daftar admin baru (email + password). Bila konfirmasi email aktif, user harus verifikasi
 *  lewat email dulu; bila nonaktif, langsung login. Mengembalikan true bila langsung punya session. */
export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await getSupabase().auth.signUp({ email, password });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

/** Kirim email reset password. Link mengarah balik ke aplikasi (mode set sandi baru). */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

/** Set password baru untuk user yang sedang login / sesi recovery. */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Logout admin. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/** Berlangganan perubahan status auth (login/logout/refresh/recovery). Kembalikan fungsi unsubscribe. */
export function onAuthChange(cb: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}
