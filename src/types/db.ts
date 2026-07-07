// Tipe data terpusat untuk integrasi backend SkyBox.
// - Tipe domain (camelCase) dipakai komponen frontend.
// - Tipe baris DB (snake_case) mencerminkan kolom Supabase; dipetakan via src/services/mappers.ts.
//
// Catatan migrasi: Account.id sudah uuid string (selaras Supabase).
// Conversation/Message/Order juga memakai uuid (string).

// ---------- Enum bersama ----------
export type Handler = 'ai' | 'human';
export type OrderStatus = 'none' | 'lead' | 'waiting_payment' | 'closing' | 'complaint';
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
  waPhoneNumberId?: string;
  waAccessToken?: string;
  metaVerifyToken?: string;
  /** Webhook N8N: lempar pesan ke N8N saat Mode AI */
  n8nWebhookUrl: string;
  /** Webhook Template: dipanggil saat template tertentu di-trigger */
  webhookUrl: string;
  /** Batas confidence: di bawah ini AI auto-serahkan ke human (0-100) */
  confidenceThreshold: number;
  /** Nomor rekening untuk alur pembayaran TF */
  bankAccount: string;
  /** Nomor WA admin untuk notifikasi (format bebas; N8N format ke @c.us). Kosong = tidak kirim notif. */
  adminNotifyPhone?: string;
  /** Cek ongkir: ID kota/subdistrict asal (sesuai API ongkir) */
  originCityId?: string;
  /** Cek ongkir: label kota asal (tampilan) */
  originLabel?: string;
  /** Mode AI aktif/nonaktif */
  aiEnabled?: boolean;
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
  replyToMessageId?: string | null;
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
  n8n_webhook_url: string;
  webhook_url: string;
  confidence_threshold: number;
  bank_account: string;
  admin_notify_phone?: string;
  wa_phone_number_id?: string;
  wa_access_token?: string;
  meta_verify_token?: string;
  ai_enabled?: boolean;
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
  reply_to_message_id?: string | null;
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
  conversation_id?: string | null;
  customer_phone?: string | null;
  created_at: string;
}

// ---------- Kontak ----------
export interface Contact {
  id: string;
  accountId: string;
  name: string;
  phone: string;
}

export interface ContactRow {
  id: string;
  account_id: string;
  name: string;
  phone: string;
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
  /** Varian produk: JSON array [{name, images}]. Dibaca AI untuk jawab varian & kirim foto. */
  variants: string;
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
  variants: string;
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

// ---------- Promo (per akun WA) ----------
export interface Promo {
  id: string;
  accountId: string;
  title: string;
  description: string;
  /** URL banner promo (Google Drive/publik) — auto-convert ke format WAHA-friendly. */
  bannerUrl: string;
  /** ID produk yang kena promo. Kosong = berlaku semua produk. */
  productIds: string[];
  isActive: boolean;
}

export interface PromoRow {
  id: string;
  account_id: string;
  title: string;
  description: string;
  banner_url: string;
  product_ids: string[] | null;
  is_active: boolean;
  created_at: string;
}

// ---------- Balasan Cepat (Quick Replies) ----------
export interface QuickReply {
  id: string;
  ownerId: string;
  shortcut: string;
  content: string;
}

export interface QuickReplyRow {
  id: string;
  owner_id: string;
  shortcut: string;
  content: string;
  created_at: string;
}

// ---------- Template Pesan Iklan ----------
export interface Template {
  id: string;
  accountId: string;
  triggerText: string;
  replyText: string;
  imageUrl: string | null;
  variants: string;
}

export interface TemplateRow {
  id: string;
  account_id: string;
  trigger_text: string;
  reply_text: string;
  image_url: string | null;
  variants: string;
  created_at: string;
}
