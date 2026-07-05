import api from './api';
import { mapProductRow, mapKnowledgeRow, mapPromoRow } from './mappers';
import type { Product, ProductRow, Knowledge, KnowledgeRow, Promo, PromoRow } from '../types/db';

// ---------- Produk ----------
export async function fetchProducts(accountId: string): Promise<Product[]> {
  const { data } = await api.get(`/resource/products/${accountId}`);
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
  if (p.variants !== undefined) row.variants = p.variants;
  return row;
}

export async function insertProduct(data: Omit<Product, 'id'>): Promise<void> {
  await api.post('/resource/products', productToRow(data));
}

export async function updateProductRow(id: string, patch: Partial<Product>): Promise<void> {
  await api.put(`/resource/products/${id}`, productToRow(patch));
}

export async function deleteProductRow(id: string): Promise<void> {
  await api.delete(`/resource/products/${id}`);
}

// ---------- Knowledge ----------
export async function fetchKnowledge(accountId: string): Promise<Knowledge[]> {
  const { data } = await api.get(`/resource/knowledge/${accountId}`);
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
  await api.post('/resource/knowledge', knowledgeToRow(data));
}

export async function updateKnowledgeRow(id: string, patch: Partial<Knowledge>): Promise<void> {
  await api.put(`/resource/knowledge/${id}`, knowledgeToRow(patch));
}

export async function deleteKnowledgeRow(id: string): Promise<void> {
  await api.delete(`/resource/knowledge/${id}`);
}

// ---------- Promo ----------
export async function fetchPromos(accountId: string): Promise<Promo[]> {
  const { data } = await api.get(`/resource/promos/${accountId}`);
  return (data as PromoRow[]).map(mapPromoRow);
}

function promoToRow(p: Partial<Omit<Promo, 'id'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.accountId !== undefined) row.account_id = p.accountId;
  if (p.title !== undefined) row.title = p.title;
  if (p.description !== undefined) row.description = p.description;
  if (p.bannerUrl !== undefined) row.banner_url = p.bannerUrl;
  if (p.productIds !== undefined) row.product_ids = p.productIds;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  return row;
}

export async function insertPromo(data: Omit<Promo, 'id'>): Promise<void> {
  await api.post('/resource/promos', promoToRow(data));
}

export async function updatePromoRow(id: string, patch: Partial<Promo>): Promise<void> {
  await api.put(`/resource/promos/${id}`, promoToRow(patch));
}

export async function deletePromoRow(id: string): Promise<void> {
  await api.delete(`/resource/promos/${id}`);
}
