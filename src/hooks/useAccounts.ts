// Hook React Query untuk daftar akun WA + mutasi CRUD.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccounts, insertAccount, updateAccountRow, deleteAccountRow } from '../services/accounts';
import { isSupabaseConfigured } from '../services/supabase';
import type { Account } from '../types/db';

const KEY = ['accounts'];

export function useAccounts() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchAccounts,
    enabled: isSupabaseConfigured,
  });
}

export function useAccountMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: (data: Omit<Account, 'id'>) => insertAccount(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Account> }) => updateAccountRow(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteAccountRow(id),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}
