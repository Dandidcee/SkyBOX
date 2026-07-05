import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { mapMessageRow } from '../services/mappers';
import type { Message, MessageRow } from '../types/db';

export function messagesKey(conversationId?: string) {
  return ['messages', conversationId];
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: async (): Promise<Message[]> => {
      const { data } = await api.get(`/messages/${conversationId}`);
      return (data as MessageRow[]).map(mapMessageRow);
    },
    enabled: !!conversationId,
  });
}
