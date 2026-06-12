// CRUD katalog produk & basis pengetahuan per akun WA.
// RLS owner-based (account_id milik admin). Murni additive; tidak menyentuh alur lama.

import { getSupabase } from './supabase';
import { mapProductRow, mapKnowledgeRow } from './mappers';
import type { Product, ProductRow, Knowledge, KnowledgeRow } from '../types/db';

// ---------- Produk ----------
export async function fetchProducts(accountId: string): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(mapProductRow);
}

function productToRow(p: Partial<Omit<Product, 'id'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.accountId !== undefined) row.account_id = p.accountId;
  if (p.name !== undefined) row.name = p.name;
  if (p.description !== undefined) row.description = p.description;
  if (p.price !== undefined) row.price = p.price;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.imageUrl !== undefined) row.image_url = p.imageUrl;
  if (p.category !== undefined) row.category = p.category;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  return row;
}

export async function insertProduct(data: Omit<Product, 'id'>): Promise<void> {
  const { error } = await getSupabase().from('products').insert(productToRow(data));
  if (error) throw error;
}

export async function updateProductRow(id: string, patch: Partial<Product>): Promise<void> {
  const { error } = await getSupabase().from('products').update(productToRow(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteProductRow(id: string): Promise<void> {
  const { error } = await getSupabase().from('products').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Knowledge ----------
export async function fetchKnowledge(accountId: string): Promise<Knowledge[]> {
  const { data, error } = await getSupabase()
    .from('knowledge')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as KnowledgeRow[]).map(mapKnowledgeRow);
}

function knowledgeToRow(k: Partial<Omit<Knowledge, 'id'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (k.accountId !== undefined) row.account_id = k.accountId;
  if (k.title !== undefined) row.title = k.title;
  if (k.content !== undefined) row.content = k.content;
  if (k.tags !== undefined) row.tags = k.tags;
  return row;
}

export async function insertKnowledge(data: Omit<Knowledge, 'id'>): Promise<void> {
  const { error } = await getSupabase().from('knowledge').insert(knowledgeToRow(data));
  if (error) throw error;
}

export async function updateKnowledgeRow(id: string, patch: Partial<Knowledge>): Promise<void> {
  const { error } = await getSupabase().from('knowledge').update(knowledgeToRow(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteKnowledgeRow(id: string): Promise<void> {
  const { error } = await getSupabase().from('knowledge').delete().eq('id', id);
  if (error) throw error;
}
