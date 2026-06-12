// Hook React Query untuk conversations per akun.
// Notifikasi + suara + status koneksi Realtime kini ditangani GLOBAL (useGlobalAlerts),
// yang juga meng-invalidate query ['conversations'] sehingga list ini ikut ter-refetch.
import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapConversationRow } from '../services/mappers';
import type { Conversation, ConversationRow } from '../types/db';

export function conversationsKey(accountId?: string) {
  return ['conversations', accountId];
}

export function useConversations(accountId: string | undefined) {
  return useQuery({
    queryKey: conversationsKey(accountId),
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await getSupabase()
        .from('conversations')
        .select('*')
        .eq('account_id', accountId!)
        .order('last_time', { ascending: false });
      if (error) throw error;
      return (data as ConversationRow[]).map(mapConversationRow);
    },
    enabled: isSupabaseConfigured && !!accountId,
  });
}
