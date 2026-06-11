// Hook React Query: daftar notifikasi (riwayat) + Realtime.
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import type { NotificationRow } from '../types/db';

const KEY = ['notifications', 'list'];

export interface NotificationItem {
  id: string;
  accountId: string | null;
  level: NotificationRow['level'];
  message: string;
  createdAt: string;
}

export function useNotificationsList() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as NotificationRow[]).map((r) => ({
        id: r.id,
        accountId: r.account_id,
        level: r.level,
        message: r.message,
        createdAt: r.created_at,
      }));
    },
    enabled: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = getSupabase()
      .channel('notifications-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () =>
        qc.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [qc]);

  return query;
}
