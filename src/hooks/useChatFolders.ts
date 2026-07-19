import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { ChatFolder, ChatFolderRow } from '../types/db';

export const chatFoldersKey = (accountId: string) => ['chatFolders', accountId];

// Mapper
const toDomain = (row: ChatFolderRow): ChatFolder => ({
  id: row.id,
  accountId: row.account_id,
  name: row.name,
  chatIds: row.chat_ids || [],
  createdAt: row.created_at,
});

export const useChatFolders = (accountId?: string) => {
  return useQuery<ChatFolder[]>({
    queryKey: chatFoldersKey(accountId!),
    queryFn: async () => {
      const res = await api.get<ChatFolderRow[]>(`/resource/chat_folders/${accountId}`);
      return res.data.map(toDomain);
    },
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // 5 menit
  });
};

export const useCreateChatFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, name, chatIds }: { accountId: string; name: string; chatIds?: string[] }) => {
      const payload = { account_id: accountId, name, chat_ids: chatIds || [] };
      const res = await api.post<ChatFolderRow>('/resource/chat_folders', payload);
      return toDomain(res.data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: chatFoldersKey(variables.accountId) });
    },
  });
};

export const useUpdateChatFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, name, chatIds }: { folderId: string; accountId: string; name?: string; chatIds?: string[] }) => {
      const payload: Partial<ChatFolderRow> = {};
      if (name !== undefined) payload.name = name;
      if (chatIds !== undefined) payload.chat_ids = chatIds;
      const res = await api.put<ChatFolderRow>(`/resource/chat_folders/${folderId}`, payload);
      return toDomain(res.data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: chatFoldersKey(variables.accountId) });
    },
  });
};

export const useDeleteChatFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId }: { folderId: string; accountId: string }) => {
      await api.delete(`/resource/chat_folders/${folderId}`);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: chatFoldersKey(variables.accountId) });
    },
  });
};
