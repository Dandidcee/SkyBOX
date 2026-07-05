import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
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

export function useNotificationsList(enabled: boolean = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data } = await api.get('/notifications');
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
    enabled,
  });
}
