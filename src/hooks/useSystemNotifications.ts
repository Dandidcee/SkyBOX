// Mendengarkan tabel `notifications` Supabase (diisi N8N, mis. workflow error)
// dan memunculkannya sebagai toast di dashboard via Realtime.
// Toast diberi prefix nama akun bila notifikasi terkait akun tertentu.
import { useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { useUiStore } from '../lib/uiStore';
import type { Account, NotificationRow } from '../types/db';

export function useSystemNotifications(accounts: Account[]) {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { notify } = useUiStore.getState();

    const channel = getSupabase()
      .channel('system-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as NotificationRow;
          const accName = row.account_id ? accounts.find((a) => a.id === row.account_id)?.name : undefined;
          notify(accName ? `[${accName}] ${row.message}` : row.message, row.level);
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [accounts]);
}
