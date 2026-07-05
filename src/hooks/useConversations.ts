import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { mapConversationRow } from '../services/mappers';
import type { Conversation, ConversationRow } from '../types/db';

export function conversationsKey(accountId?: string) {
  return ['conversations', accountId];
}

export function useConversations(accountId: string | undefined) {
  return useQuery({
    queryKey: conversationsKey(accountId),
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await api.get(`/conversations/${accountId}`);
      return (data as ConversationRow[]).map(mapConversationRow);
    },
    enabled: !!accountId,
  });
}
