import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { mapQuickReplyRow } from '../services/mappers';
import type { QuickReply, QuickReplyRow } from '../types/db';

export function quickRepliesKey() {
  return ['quick_replies'];
}

export function useQuickReplies() {
  return useQuery({
    queryKey: quickRepliesKey(),
    queryFn: async (): Promise<QuickReply[]> => {
      const { data, error } = await getSupabase()
        .from('quick_replies')
        .select('*')
        .order('shortcut', { ascending: true });
      if (error) throw error;
      return (data as QuickReplyRow[]).map(mapQuickReplyRow);
    },
    enabled: isSupabaseConfigured,
  });
}

export function useAddQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reply: Pick<QuickReply, 'shortcut' | 'content'>) => {
      // Dapatkan owner_id (user ID login saat ini)
      const { data: userData, error: userError } = await getSupabase().auth.getUser();
      if (userError || !userData.user) throw new Error('User not authenticated');

      const { data, error } = await getSupabase()
        .from('quick_replies')
        .insert([{
          owner_id: userData.user.id,
          shortcut: reply.shortcut.replace(/^\/+/, ''), // Hapus awalan '/' jika ada
          content: reply.content
        }])
        .select()
        .single();
      if (error) throw error;
      return mapQuickReplyRow(data as QuickReplyRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quickRepliesKey() });
    },
  });
}

export function useUpdateQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Pick<QuickReply, 'shortcut' | 'content'>> }) => {
      const payload: Partial<QuickReplyRow> = {};
      if (args.patch.shortcut !== undefined) payload.shortcut = args.patch.shortcut.replace(/^\/+/, '');
      if (args.patch.content !== undefined) payload.content = args.patch.content;

      const { data, error } = await getSupabase()
        .from('quick_replies')
        .update(payload)
        .eq('id', args.id)
        .select()
        .single();
      if (error) throw error;
      return mapQuickReplyRow(data as QuickReplyRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quickRepliesKey() });
    },
  });
}

export function useDeleteQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase()
        .from('quick_replies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quickRepliesKey() });
    },
  });
}
