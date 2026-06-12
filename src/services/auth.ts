// Service autentikasi admin (Supabase Auth).
// Admin dibuat manual di dashboard Supabase (Authentication > Users). Tidak ada signup publik.
// Login memakai email + password; session disimpan otomatis oleh supabase-js (localStorage).

import type { Session, User } from '@supabase/supabase-js';
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

/** Logout admin. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/** Berlangganan perubahan status auth (login/logout/refresh). Kembalikan fungsi unsubscribe. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
