// Tipe data terpusat untuk integrasi backend SkyBox.
// - Tipe domain (camelCase) dipakai komponen frontend.
// - Tipe baris DB (snake_case) mencerminkan kolom Supabase; dipetakan via src/services/mappers.ts.
//
// Catatan migrasi: Account.id sudah uuid string (selaras Supabase).
// Conversation/Message/Order juga memakai uuid (string).

// ---------- Enum bersama ----------
export type Handler = 'ai' | 'human';
export type OrderStatus = 'none' | 'lead' | 'waiting_payment' | 'closing';
export type MessageDirection = 'in' | 'out';
export type MessageType = 'text' | 'image' | 'document';
export type OrderType = 'tf' | 'cod';
export type NotificationLevel = 'info' | 'success' | 'warn' | 'error';

// ---------- Tipe domain (frontend) ----------
export interface Account {
  id: string; // uuid Supabase
  /** uuid admin pemilik (auth.users). Diisi otomatis saat membuat akun. */
  ownerId?: string | null;
  name: string;
  phone: string;
  color: string;
  /** Nama session di WAHA (1 nomor WA = 1 session) */
  wahaSession: string;
  /** Webhook N8N: ambil alih / kembalikan handler (toggle AI/Human) */
  toggleWebhookUrl: string;
  /** Webhook N8N: kirim balasan teks */
  sendMessageWebhookUrl: string;
  /** Webhook N8N: kirim media (gambar/PDF) */
  sendMediaWebhookUrl: string;
  /** Batas confidence: di bawah ini AI auto-serahkan ke human (0-100) */
  confidenceThreshold: number;
  /** Nomor rekening untuk alur pembayaran TF */
  bankAccount: string;
}

export interface Conversation {
  id: string;
  accountId: string;
  customerPhone: string;
  customerName: string;
  handler: Handler;
  orderStatus: OrderStatus;
  confidence: number;
  lastPreview: string;
  lastTime: string;
  unread: number;
}

export interface Message {
  id: string;
  conversationId: string;
  externalId: string | null;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  conversationId: string;
  type: OrderType;
  status: string;
  address: string | null;
  amount: number | null;
}

// ---------- Tipe baris DB (snake_case, sesuai Supabase) ----------
export interface AccountRow {
  id: string;
  owner_id: string | null;
  name: string;
  phone: string;
  color: string;
  waha_session: string;
  toggle_webhook_url: string;
  send_message_webhook_url: string;
  send_media_webhook_url: string;
  confidence_threshold: number;
  bank_account: string;
}

export interface ConversationRow {
  id: string;
  account_id: string;
  customer_phone: string;
  customer_name: string;
  handler: Handler;
  order_status: OrderStatus;
  confidence: number;
  last_preview: string;
  last_time: string;
  unread: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  external_message_id: string | null;
  direction: MessageDirection;
  type: MessageType;
  body: string;
  media_url: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  conversation_id: string;
  type: OrderType;
  status: string;
  address: string | null;
  amount: number | null;
}

export interface NotificationRow {
  id: string;
  account_id: string | null;
  level: NotificationLevel;
  message: string;
  created_at: string;
}
