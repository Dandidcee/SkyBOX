// Hook React Query untuk orders per conversation + Realtime.
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapOrderRow } from '../services/mappers';
import type { Order, OrderRow } from '../types/db';

export function ordersKey(conversationId?: string) {
  return ['orders', conversationId];
}

export function useOrders(conversationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ordersKey(conversationId),
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await getSupabase()
        .from('orders')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as OrderRow[]).map(mapOrderRow);
    },
    enabled: isSupabaseConfigured && !!conversationId,
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !conversationId) return;
    const channel = getSupabase()
      .channel(`orders-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ordersKey(conversationId) })
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}
