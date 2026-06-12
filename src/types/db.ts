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
  /** Webhook N8N: analisis/rangkum percakapan (AI agent) */
  analyzeWebhookUrl: string;
  /** Batas confidence: di bawah ini AI auto-serahkan ke human (0-100) */
  confidenceThreshold: number;
  /** Nomor rekening untuk alur pembayaran TF */
  bankAccount: string;
  /** Cek ongkir: ID kota/subdistrict asal (sesuai API ongkir) */
  originCityId?: string;
  /** Cek ongkir: label kota asal (tampilan) */
  originLabel?: string;
}

export interface Conversation {
  id: string;
  accountId: string;
  customerPhone: string;
  customerName: string;
  /** JID/@lid asli WAHA untuk balas pesan (payload.from) */
  chatId: string;
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
  items: string;
  note: string;
  verified: boolean;
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
  analyze_webhook_url: string;
  confidence_threshold: number;
  bank_account: string;
}

export interface ConversationRow {
  id: string;
  account_id: string;
  customer_phone: string;
  customer_name: string;
  chat_id: string;
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
  items: string;
  note: string;
  verified: boolean;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  account_id: string | null;
  level: NotificationLevel;
  message: string;
  created_at: string;
}

// ---------- Produk & Knowledge (per akun WA) ----------
export interface Product {
  id: string;
  accountId: string;
  name: string;
  description: string;
  price: number | null;
  sku: string;
  stock: number | null;
  imageUrl: string;
  category: string;
  isActive: boolean;
}

export interface ProductRow {
  id: string;
  account_id: string;
  name: string;
  description: string;
  price: number | null;
  sku: string;
  stock: number | null;
  image_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface Knowledge {
  id: string;
  accountId: string;
  title: string;
  content: string;
  tags: string;
}

export interface KnowledgeRow {
  id: string;
  account_id: string;
  title: string;
  content: string;
  tags: string;
  created_at: string;
}
