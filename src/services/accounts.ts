// CRUD akun WhatsApp ke tabel Supabase `accounts`.
// Keamanan: RLS berbasis kepemilikan (accounts.owner_id = auth.uid()). Admin hanya
// bisa mengelola akun miliknya. insertAccount mengisi owner_id dari user yang login.

import { getSupabase } from './supabase';
import { mapAccountRow } from './mappers';
import type { Account, AccountRow } from '../types/db';

const TABLE = 'accounts';

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as AccountRow[]).map(mapAccountRow);
}

/** Konversi tipe domain (camelCase) -> kolom DB (snake_case) untuk insert/update. */
function toRow(a: Partial<Omit<Account, 'id'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (a.name !== undefined) row.name = a.name;
  if (a.phone !== undefined) row.phone = a.phone;
  if (a.color !== undefined) row.color = a.color;
  if (a.wahaSession !== undefined) row.waha_session = a.wahaSession;
  if (a.toggleWebhookUrl !== undefined) row.toggle_webhook_url = a.toggleWebhookUrl;
  if (a.sendMessageWebhookUrl !== undefined) row.send_message_webhook_url = a.sendMessageWebhookUrl;
  if (a.sendMediaWebhookUrl !== undefined) row.send_media_webhook_url = a.sendMediaWebhookUrl;
  if (a.analyzeWebhookUrl !== undefined) row.analyze_webhook_url = a.analyzeWebhookUrl;
  if (a.confidenceThreshold !== undefined) row.confidence_threshold = a.confidenceThreshold;
  if (a.bankAccount !== undefined) row.bank_account = a.bankAccount;
  return row;
}

export async function insertAccount(data: Omit<Account, 'id'>): Promise<void> {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error('Harus login untuk menambah akun.');
  const { error } = await sb.from(TABLE).insert({ ...toRow(data), owner_id: ownerId });
  if (error) throw error;
}

export async function updateAccountRow(id: string, patch: Partial<Account>): Promise<void> {
  const { error } = await getSupabase().from(TABLE).update(toRow(patch)).eq('id', id);
  if (error) throw error;
}

export async function deleteAccountRow(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
