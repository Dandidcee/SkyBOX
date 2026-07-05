import api from './api';
import { mapAccountRow } from './mappers';
import type { Account, AccountRow } from '../types/db';

export async function fetchAccounts(): Promise<Account[]> {
  const { data } = await api.get('/accounts');
  return (data as AccountRow[]).map(mapAccountRow);
}

function toRow(a: Partial<Omit<Account, 'id'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (a.name !== undefined) row.name = a.name;
  if (a.phone !== undefined) row.phone = a.phone;
  if (a.color !== undefined) row.color = a.color;
  if (a.waPhoneNumberId !== undefined) row.wa_phone_number_id = a.waPhoneNumberId;
  if (a.waAccessToken !== undefined) row.wa_access_token = a.waAccessToken;
  if (a.metaVerifyToken !== undefined) row.meta_verify_token = a.metaVerifyToken;
  if (a.n8nWebhookUrl !== undefined) row.n8n_webhook_url = a.n8nWebhookUrl;
  if (a.webhookUrl !== undefined) row.webhook_url = a.webhookUrl;
  if (a.confidenceThreshold !== undefined) row.confidence_threshold = a.confidenceThreshold;
  if (a.bankAccount !== undefined) row.bank_account = a.bankAccount;
  if (a.adminNotifyPhone !== undefined) row.admin_notify_phone = a.adminNotifyPhone;
  return row;
}

export async function insertAccount(data: Omit<Account, 'id'>): Promise<void> {
  await api.post('/accounts', toRow(data));
}

export async function updateAccountRow(id: string, patch: Partial<Account>): Promise<void> {
  await api.put(`/accounts/${id}`, toRow(patch));
}

export async function deleteAccountRow(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`);
}
