import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { mapOrderRow } from '../services/mappers';
import type { Order, OrderRow } from '../types/db';

export function ordersKey(conversationId?: string) {
  return ['orders', conversationId];
}

export function useOrders(conversationId: string | undefined) {
  return useQuery({
    queryKey: ordersKey(conversationId),
    queryFn: async (): Promise<Order[]> => {
      const { data } = await api.get(`/orders/${conversationId}`);
      return (data as OrderRow[]).map(mapOrderRow);
    },
    enabled: !!conversationId,
  });
}
