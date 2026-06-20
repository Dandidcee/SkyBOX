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
  conversationId?: string | null;
  customerPhone?: string | null;
  createdAt: string;
}

export function useNotificationsList() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('id,account_id,level,message,conversation_id,customer_phone,created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as NotificationRow[]).map((r) => {
        return {
          id: r.id,
          accountId: r.account_id,
          level: r.level,
          message: r.message,
          conversationId: r.conversation_id,
          customerPhone: r.customer_phone,
          createdAt: r.created_at,
        };
      });
    },
    enabled: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // Nama channel unik per instance hook (dipakai di App badge + halaman Notifikasi
    // sekaligus). Nama sama → Supabase error "cannot add callbacks after subscribe()".
    const channelName = `notifications-list-${Math.random().toString(36).slice(2)}`;
    const channel = getSupabase()
      .channel(channelName)
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
