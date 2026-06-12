// Hook React Query untuk conversations per akun + langganan Realtime + notifikasi.
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapConversationRow } from '../services/mappers';
import { useUiStore } from '../lib/uiStore';
import { playEventSound } from '../lib/soundStore';
import type { Conversation, ConversationRow } from '../types/db';

export function conversationsKey(accountId?: string) {
  return ['conversations', accountId];
}

const labelOf = (r: Partial<ConversationRow>) => r.customer_name || r.customer_phone || 'Pelanggan';

export function useConversations(accountId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
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

  // Realtime: notifikasi + refetch saat ada perubahan conversation milik akun ini.
  useEffect(() => {
    if (!isSupabaseConfigured || !accountId) return;
    const { notify, setRealtime } = useUiStore.getState();

    const channel = getSupabase()
      .channel(`conversations-${accountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `account_id=eq.${accountId}` },
        (payload) => {
          const oldRow = payload.old as Partial<ConversationRow> | undefined;
          const newRow = payload.new as ConversationRow | undefined;
          if (payload.eventType === 'UPDATE' && oldRow && newRow) {
            // Pesan masuk baru (unread naik)
            if ((newRow.unread ?? 0) > (oldRow.unread ?? 0)) {
              notify(`Pesan baru dari ${labelOf(newRow)}`, 'info');
              playEventSound('incoming');
            }
            // AI menyerahkan ke manusia
            if (oldRow.handler === 'ai' && newRow.handler === 'human') {
              notify(`${labelOf(newRow)} butuh penanganan manusia`, 'warn');
              playEventSound('lowConfidence');
            }
            // Order masuk menunggu pembayaran (TF)
            if (oldRow.order_status !== 'waiting_payment' && newRow.order_status === 'waiting_payment') {
              notify(`Order masuk: ${labelOf(newRow)} menunggu pembayaran`, 'success');
            }
          }
          qc.invalidateQueries({ queryKey: conversationsKey(accountId) });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtime('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtime('disconnected');
        else setRealtime('connecting');
      });

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [accountId, qc]);

  return query;
}
