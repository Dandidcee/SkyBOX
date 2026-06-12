// Hook React Query: daftar semua order (lintas percakapan) untuk Tracking Order.
// Join ke conversations (nama/nomor/akun/fase). RLS membatasi ke akun milik admin.
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import type { OrderType, OrderStatus } from '../types/db';

export interface OrderListItem {
  id: string;
  conversationId: string;
  createdAt: string;
  type: OrderType;
  status: string;
  address: string | null;
  amount: number | null;
  items: string;
  note: string;
  verified: boolean;
  customerName: string;
  customerPhone: string;
  accountId: string;
  orderStatus: OrderStatus | '';
}

interface JoinedRow {
  id: string;
  conversation_id: string;
  created_at: string;
  type: OrderType;
  status: string;
  address: string | null;
  amount: number | null;
  items: string | null;
  note: string | null;
  verified: boolean | null;
  conversations: {
    customer_name: string | null;
    customer_phone: string | null;
    account_id: string | null;
    order_status: OrderStatus | null;
  } | null;
}

const KEY = ['orders', 'list'];

export function useAllOrders() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<OrderListItem[]> => {
      const { data, error } = await getSupabase()
        .from('orders')
        .select('id,conversation_id,created_at,type,status,address,amount,items,note,verified,conversations(customer_name,customer_phone,account_id,order_status)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as unknown as JoinedRow[]).map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        createdAt: r.created_at,
        type: r.type,
        status: r.status,
        address: r.address,
        amount: r.amount,
        items: r.items ?? '',
        note: r.note ?? '',
        verified: r.verified ?? false,
        customerName: r.conversations?.customer_name ?? '',
        customerPhone: r.conversations?.customer_phone ?? '',
        accountId: r.conversations?.account_id ?? '',
        orderStatus: r.conversations?.order_status ?? '',
      }));
    },
    enabled: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = getSupabase()
      .channel('orders-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () =>
        qc.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [qc]);

  return query;
}
