// Hook React Query: ambil SEMUA conversations (lintas akun) untuk Dashboard/Analytics.
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { mapConversationRow } from '../services/mappers';
import type { Conversation, ConversationRow } from '../types/db';

export function useAllConversations(enabled: boolean = true) {
  return useQuery({
    queryKey: ['conversations', 'all'],
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await api.get('/conversations-list');
      return (data as ConversationRow[]).map(mapConversationRow);
    },
    enabled,
  });
}
