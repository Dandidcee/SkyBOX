import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { mapQuickReplyRow } from '../services/mappers';
import type { QuickReply, QuickReplyRow } from '../types/db';

export function quickRepliesKey() {
  return ['quick_replies'];
}

export function useQuickReplies() {
  return useQuery({
    queryKey: quickRepliesKey(),
    queryFn: async (): Promise<QuickReply[]> => {
      const { data } = await api.get('/quick_replies');
      return (data as QuickReplyRow[]).map(mapQuickReplyRow);
    },
  });
}

export function useAddQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reply: Pick<QuickReply, 'shortcut' | 'content'>) => {
      const { data } = await api.post('/quick_replies', {
        shortcut: reply.shortcut.replace(/^\/+/, ''), // Hapus awalan '/' jika ada
        content: reply.content
      });
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
      const payload: any = {};
      if (args.patch.shortcut !== undefined) payload.shortcut = args.patch.shortcut.replace(/^\/+/, '');
      if (args.patch.content !== undefined) payload.content = args.patch.content;

      const { data } = await api.put(`/quick_replies/${args.id}`, payload);
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
      await api.delete(`/quick_replies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quickRepliesKey() });
    },
  });
}
