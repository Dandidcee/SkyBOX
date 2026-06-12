// Listener Realtime GLOBAL untuk conversations (semua akun milik admin).
// Memunculkan notifikasi + suara (pesan masuk, auto-human, order TF) lintas akun —
// tidak bergantung pada Inbox akun mana yang sedang dibuka. Juga set status koneksi
// Realtime + refetch query conversations (Dashboard/Analytics/Inbox ikut ter-update).
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { useUiStore } from '../lib/uiStore';
import { playEventSound } from '../lib/soundStore';
import { wasSelfHandlerChange } from '../lib/selfActions';
import type { Account, ConversationRow } from '../types/db';

export function useGlobalAlerts(accounts: Account[], enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured || !enabled) return;
    const { notify, setRealtime } = useUiStore.getState();

    const channel = getSupabase()
      .channel('global-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          const oldRow = payload.old as Partial<ConversationRow> | undefined;
          const newRow = payload.new as ConversationRow | undefined;
          if (payload.eventType === 'UPDATE' && oldRow && newRow) {
            const label = newRow.customer_name || newRow.customer_phone || 'Pelanggan';
            const accName = accounts.find((a) => a.id === newRow.account_id)?.name;
            const prefix = accName ? `[${accName}] ` : '';

            // Pesan masuk baru (unread naik)
            if ((newRow.unread ?? 0) > (oldRow.unread ?? 0)) {
              notify(`${prefix}Pesan baru dari ${label}`, 'info');
              playEventSound('incoming');
            }
            // AI menyerahkan ke manusia — abaikan bila CS sendiri yang toggle
            if (oldRow.handler === 'ai' && newRow.handler === 'human' && !wasSelfHandlerChange(newRow.id)) {
              notify(`${prefix}${label} butuh penanganan manusia`, 'warn');
              playEventSound('lowConfidence');
            }
            // Order masuk menunggu pembayaran (TF)
            if (oldRow.order_status !== 'waiting_payment' && newRow.order_status === 'waiting_payment') {
              notify(`${prefix}Order masuk: ${label} menunggu pembayaran`, 'success');
            }
          }
          // Refetch semua query conversations (per-akun + all) agar UI sinkron.
          qc.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtime('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtime('disconnected');
        else if (status !== 'CLOSED') setRealtime('connecting');
      });

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [accounts, qc, enabled]);
}
