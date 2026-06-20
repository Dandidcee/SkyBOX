import { getSupabase } from './supabase';

export async function deleteConversations(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await getSupabase().from('conversations').delete().in('id', ids);
  if (error) throw error;
}
