import { useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { useUiStore } from '../lib/uiStore';
import { playEventSound } from '../lib/soundStore';
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
          if (row.level === 'error' || row.level === 'warn') playEventSound('error');
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [accounts]);
}
