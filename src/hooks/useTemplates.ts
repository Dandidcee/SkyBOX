import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { mapTemplateRow } from '../services/mappers';
import type { Template, TemplateRow } from '../types/db';

export function templatesKey(accountId?: string) {
  return ['templates', accountId];
}

export function useTemplates(accountId: string | undefined) {
  return useQuery({
    queryKey: templatesKey(accountId),
    queryFn: async (): Promise<Template[]> => {
      const { data } = await api.get(`/resource/templates/${accountId}`);
      return (data as TemplateRow[]).map(mapTemplateRow);
    },
    enabled: !!accountId,
  });
}

export function useTemplateMutations(accountId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: templatesKey(accountId) });

  const save = useMutation({
    mutationFn: async (args: { id?: string; data: Omit<Template, 'id'> }) => {
      const payload: Partial<TemplateRow> = {
        account_id: args.data.accountId,
        trigger_text: args.data.triggerText || 'global',
        reply_text: args.data.replyText,
        image_url: args.data.imageUrl,
        variants: args.data.variants,
      };

      if (args.id) {
        // Update existing
        const { data } = await api.put(`/resource/templates/${args.id}`, payload);
        return mapTemplateRow(data as TemplateRow);
      } else {
        // Insert new
        const { data } = await api.post('/resource/templates', payload);
        return mapTemplateRow(data as TemplateRow);
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resource/templates/${id}`);
      return true;
    },
    onSuccess: invalidate,
  });

  return { save, remove };
}
