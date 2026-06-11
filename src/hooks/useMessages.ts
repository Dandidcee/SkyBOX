// Hook React Query untuk messages per conversation + langganan Realtime.
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapMessageRow } from '../services/mappers';
import type { Message, MessageRow } from '../types/db';

export function messagesKey(conversationId?: string) {
  return ['messages', conversationId];
}

export function useMessages(conversationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await getSupabase()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as MessageRow[]).map(mapMessageRow);
    },
    enabled: isSupabaseConfigured && !!conversationId,
  });

  // Realtime: pesan baru pada conversation ini -> refetch.
  useEffect(() => {
    if (!isSupabaseConfigured || !conversationId) return;
    const channel = getSupabase()
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: messagesKey(conversationId) })
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}
