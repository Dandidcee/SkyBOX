// Update order dari dashboard (CS verifikasi). RLS: hanya order milik akun admin.
import { getSupabase } from './supabase';

export async function setOrderVerified(id: string, verified: boolean): Promise<void> {
  const { error } = await getSupabase().from('orders').update({ verified }).eq('id', id);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await getSupabase().from('orders').delete().eq('id', id);
  if (error) throw error;
}

