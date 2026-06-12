// Hooks React Query untuk produk & knowledge per akun. Refetch via invalidate (tanpa Realtime).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts, insertProduct, updateProductRow, deleteProductRow,
  fetchKnowledge, insertKnowledge, updateKnowledgeRow, deleteKnowledgeRow,
} from '../services/catalog';
import { isSupabaseConfigured } from '../services/supabase';
import type { Product, Knowledge } from '../types/db';

const productsKey = (accountId?: string) => ['products', accountId];
const knowledgeKey = (accountId?: string) => ['knowledge', accountId];

// ---------- Produk ----------
export function useProducts(accountId: string | undefined) {
  return useQuery({
    queryKey: productsKey(accountId),
    queryFn: () => fetchProducts(accountId!),
    enabled: isSupabaseConfigured && !!accountId,
  });
}

export function useProductMutations(accountId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: productsKey(accountId) });

  const add = useMutation({
    mutationFn: (data: Omit<Product, 'id'>) => insertProduct(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Product> }) => updateProductRow(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteProductRow(id),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

// ---------- Knowledge ----------
export function useKnowledge(accountId: string | undefined) {
  return useQuery({
    queryKey: knowledgeKey(accountId),
    queryFn: () => fetchKnowledge(accountId!),
    enabled: isSupabaseConfigured && !!accountId,
  });
}

export function useKnowledgeMutations(accountId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: knowledgeKey(accountId) });

  const add = useMutation({
    mutationFn: (data: Omit<Knowledge, 'id'>) => insertKnowledge(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Knowledge> }) => updateKnowledgeRow(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteKnowledgeRow(id),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}
