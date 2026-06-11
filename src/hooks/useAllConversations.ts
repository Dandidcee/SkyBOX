// Hook React Query: ambil SEMUA conversations (lintas akun) untuk Dashboard/Analytics.
import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapConversationRow } from '../services/mappers';
import type { Conversation, ConversationRow } from '../types/db';

export function useAllConversations() {
  return useQuery({
    queryKey: ['conversations', 'all'],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await getSupabase().from('conversations').select('*');
      if (error) throw error;
      return (data as ConversationRow[]).map(mapConversationRow);
    },
    enabled: isSupabaseConfigured,
  });
}
