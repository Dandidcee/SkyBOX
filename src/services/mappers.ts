// Pemetaan baris DB (snake_case) -> tipe domain frontend (camelCase).
// Fungsi murni; mengisolasi penamaan kolom Supabase dari komponen.

import type {
  Account, AccountRow,
  Conversation, ConversationRow,
  Message, MessageRow,
  Order, OrderRow,
  Product, ProductRow,
  Knowledge, KnowledgeRow,
} from '../types/db';

export const mapAccountRow = (r: AccountRow): Account => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  phone: r.phone,
  color: r.color,
  wahaSession: r.waha_session,
  toggleWebhookUrl: r.toggle_webhook_url,
  sendMessageWebhookUrl: r.send_message_webhook_url,
  sendMediaWebhookUrl: r.send_media_webhook_url,
  analyzeWebhookUrl: r.analyze_webhook_url,
  confidenceThreshold: r.confidence_threshold,
  bankAccount: r.bank_account,
});

export const mapConversationRow = (r: ConversationRow): Conversation => ({
  id: r.id,
  accountId: r.account_id,
  customerPhone: r.customer_phone,
  customerName: r.customer_name,
  chatId: r.chat_id,
  handler: r.handler,
  orderStatus: r.order_status,
  confidence: r.confidence,
  lastPreview: r.last_preview,
  lastTime: r.last_time,
  unread: r.unread,
});

export const mapMessageRow = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  externalId: r.external_message_id,
  direction: r.direction,
  type: r.type,
  body: r.body,
  mediaUrl: r.media_url,
  createdAt: r.created_at,
});

export const mapOrderRow = (r: OrderRow): Order => ({
  id: r.id,
  conversationId: r.conversation_id,
  type: r.type,
  status: r.status,
  address: r.address,
  amount: r.amount,
  items: r.items,
  note: r.note,
});

export const mapProductRow = (r: ProductRow): Product => ({
  id: r.id,
  accountId: r.account_id,
  name: r.name,
  description: r.description,
  price: r.price,
  sku: r.sku,
  stock: r.stock,
  imageUrl: r.image_url,
  category: r.category,
  isActive: r.is_active,
});

export const mapKnowledgeRow = (r: KnowledgeRow): Knowledge => ({
  id: r.id,
  accountId: r.account_id,
  title: r.title,
  content: r.content,
  tags: r.tags,
});
