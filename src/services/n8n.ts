// Service untuk berkomunikasi dengan webhook N8N.
// Setiap akun WhatsApp punya URL webhook TERPISAH per aksi:
//   - toggleWebhookUrl       : ambil alih / kembalikan handler AI<->Human
//   - sendMessageWebhookUrl  : kirim balasan teks
//   - sendMediaWebhookUrl    : kirim media (gambar/PDF)
// N8N yang mengubah status & kirim pesan via WAHA; frontend hanya kirim perintah.

import type { Account } from '../types/db';

export type ConversationHandler = 'ai' | 'human';
export type MediaType = 'image' | 'document';

/** Aksi yang tersedia, dipetakan ke field URL webhook pada Account */
export type N8nAction = 'toggle' | 'sendMessage' | 'sendMedia' | 'analyze';

const WEBHOOK_FIELD: Record<N8nAction, keyof Account> = {
  toggle: 'toggleWebhookUrl',
  sendMessage: 'sendMessageWebhookUrl',
  sendMedia: 'sendMediaWebhookUrl',
  analyze: 'analyzeWebhookUrl',
};

/**
 * Memanggil webhook N8N milik sebuah akun untuk aksi tertentu.
 * Memilih URL sesuai aksi; melempar error bila URL belum diatur atau respons gagal,
 * agar pemanggil bisa rollback state.
 */
async function callN8n(
  account: Account,
  action: N8nAction,
  payload: Record<string, unknown>
): Promise<void> {
  const url = (account[WEBHOOK_FIELD[action]] as string)?.trim();
  if (!url) {
    throw new Error(`Webhook "${action}" untuk akun "${account.name}" belum diatur. Lengkapi di menu Integrations.`);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      accountId: account.id,
      accountPhone: account.phone,
      wahaSession: account.wahaSession,
      ...payload,
    }),
  });

  if (!res.ok) {
    throw new Error(`Webhook N8N gagal (HTTP ${res.status})`);
  }
}

/** Ambil alih / kembalikan ke AI untuk satu percakapan */
export function setConversationHandler(
  account: Account,
  payload: { conversationId: string; phone: string; chatId: string; handler: ConversationHandler }
): Promise<void> {
  return callN8n(account, 'toggle', payload);
}

/** Kirim balasan teks ke pelanggan via N8N -> WAHA */
export function sendTextMessage(
  account: Account,
  payload: { conversationId: string; phone: string; chatId: string; text: string }
): Promise<void> {
  return callN8n(account, 'sendMessage', payload);
}

/** Kirim media (gambar/PDF) ke pelanggan via N8N -> WAHA.
 *  Frontend kirim base64 (data URL) tanpa menyimpan file; N8N yang unggah/teruskan ke WAHA. */
export function sendMedia(
  account: Account,
  payload: { conversationId: string; phone: string; chatId: string; mediaType: MediaType; filename: string; dataBase64: string; caption?: string }
): Promise<void> {
  return callN8n(account, 'sendMedia', payload);
}

/** Minta N8N (AI agent) merangkum/menganalisis percakapan.
 *  Mengembalikan teks ringkasan dari respons webhook (butuh CORS `*` di N8N). */
export async function analyzeConversation(
  account: Account,
  payload: { conversationId: string; phone: string; chatId: string }
): Promise<string> {
  const url = account.analyzeWebhookUrl?.trim();
  if (!url) {
    throw new Error(`Webhook "analyze" untuk akun "${account.name}" belum diatur. Lengkapi di menu Integrations.`);
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'analyze',
      accountId: account.id,
      accountPhone: account.phone,
      wahaSession: account.wahaSession,
      ...payload,
    }),
  });
  if (!res.ok) throw new Error(`Analisis gagal (HTTP ${res.status})`);
  const data = await res.json().catch(() => null);
  if (data == null) return '';
  if (typeof data === 'string') return data;
  return data.summary ?? data.result ?? data.text ?? data.output ?? JSON.stringify(data);
}
