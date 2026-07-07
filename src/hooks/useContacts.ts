import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { mapContactRow } from '../services/mappers';
import type { Contact, ContactRow } from '../types/db';

export const useContacts = (accountId: string) => {
  return useQuery({
    queryKey: ['contacts', accountId],
    queryFn: async (): Promise<Contact[]> => {
      if (!accountId) return [];
      const res = await api.get<ContactRow[]>(`/resource/contacts/${accountId}`);
      return res.data.map(mapContactRow);
    },
    enabled: !!accountId,
  });
};

export const useContactMutations = (accountId: string) => {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: async (data: Omit<Contact, 'id' | 'accountId'>) => {
      const res = await api.post<ContactRow>(`/resource/contacts`, {
        account_id: accountId,
        name: data.name,
        phone: data.phone,
      });
      return mapContactRow(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', accountId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Contact> }) => {
      const snakePatch: Record<string, unknown> = {};
      if (patch.name !== undefined) snakePatch.name = patch.name;
      if (patch.phone !== undefined) snakePatch.phone = patch.phone;
      
      const res = await api.put<ContactRow>(`/resource/contacts/${id}`, snakePatch);
      return mapContactRow(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', accountId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resource/contacts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', accountId] }),
  });

  return { add, update, remove };
};
