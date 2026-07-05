// Hook React Query untuk daftar akun WA + mutasi CRUD.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccounts, insertAccount, updateAccountRow, deleteAccountRow } from '../services/accounts';
import type { Account } from '../types/db';

export function accountsKey() {
  return ['accounts'];
}

export function useAccounts(enabled: boolean = true) {
  return useQuery({
    queryKey: accountsKey(),
    queryFn: fetchAccounts,
    enabled,
  });
}

export function useAccountMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: accountsKey() });

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
