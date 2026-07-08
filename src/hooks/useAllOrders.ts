import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
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

const KEY = ['orders', 'list'];

interface OrderRowRaw {
  id: string;
  conversation_id: string;
  account_id?: string;
  order_status?: string;
  created_at: string;
  type: 'tf' | 'cod';
  status: string;
  address: string | null;
  amount: number | null;
  items?: string;
  note?: string;
  verified?: boolean;
  customer_name?: string;
  customer_phone?: string;
}

export function useAllOrders() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<OrderListItem[]> => {
      const { data } = await api.get('/orders-list');
      return data.map((r: OrderRowRaw) => ({
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
        customerName: r.customer_name ?? '',
        customerPhone: r.customer_phone ?? '',
        accountId: r.account_id ?? '',
        orderStatus: r.order_status ?? '',
      }));
    },
  });
}
