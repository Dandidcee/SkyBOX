import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapTemplateRow } from '../services/mappers';
import type { Template, TemplateRow } from '../types/db';

export function templatesKey(accountId?: string) {
  return ['templates', accountId];
}

export function useTemplates(accountId: string | undefined) {
  return useQuery({
    queryKey: templatesKey(accountId),
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await getSupabase()
        .from('templates')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as TemplateRow[]).map(mapTemplateRow);
    },
    enabled: isSupabaseConfigured && !!accountId,
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
        const { data, error } = await getSupabase()
          .from('templates')
          .update(payload)
          .eq('id', args.id)
          .select()
          .single();
        if (error) throw error;
        return mapTemplateRow(data as TemplateRow);
      } else {
        // Insert new
        const { data, error } = await getSupabase()
          .from('templates')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return mapTemplateRow(data as TemplateRow);
      }
    },
    onSuccess: invalidate,
  });

  return { save };
}
