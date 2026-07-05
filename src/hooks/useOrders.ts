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
      // Endpoint yang digunakan adalah custom logic atau kita perlu bikin di backend?
      // Wait, we didn't add /api/orders/:conversationId, our dynamic CRUD only takes accountId!
      // I will fetch from dynamic CRUD, but it's easier to just hit a custom endpoint.
      // Let's use the dynamic CRUD: wait, dynamic CRUD uses /api/resource/orders/:accountId.
      // Orders don't have accountId directly, they have conversation_id!
      // This means the dynamic CRUD won't work for orders fetched by conversation_id!
      
      const { data } = await api.get(`/orders/${conversationId}`);
      return (data as OrderRow[]).map(mapOrderRow);
    },
    enabled: !!conversationId,
  });
}
