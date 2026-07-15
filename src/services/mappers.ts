// Pemetaan baris DB (snake_case) -> tipe domain frontend (camelCase).
// Fungsi murni; mengisolasi penamaan kolom Supabase dari komponen.

import type {
  Account, AccountRow,
  Conversation, ConversationRow,
  Message, MessageRow,
  Order, OrderRow,
  Product, ProductRow,
  Knowledge, KnowledgeRow,
  Promo, PromoRow,
  QuickReply, QuickReplyRow,
  Template, TemplateRow,
  Contact, ContactRow,
} from '../types/db';

export const mapAccountRow = (r: AccountRow): Account => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  phone: r.phone,
  color: r.color,
  waPhoneNumberId: r.wa_phone_number_id || '',
  waAccessToken: r.wa_access_token || '',
  metaVerifyToken: r.meta_verify_token || '',
  n8nWebhookUrl: r.n8n_webhook_url,
  webhookUrl: r.webhook_url || '',
  confidenceThreshold: r.confidence_threshold,
  bankAccount: r.bank_account,
  adminNotifyPhone: r.admin_notify_phone ?? '',
  aiEnabled: r.ai_enabled ?? true,
});

export const mapContactRow = (r: ContactRow): Contact => ({
  id: r.id,
  accountId: r.account_id,
  name: r.name,
  phone: r.phone,
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
  replyToMessageId: r.reply_to_message_id,
  direction: r.direction,
  type: r.type,
  body: r.body,
  mediaUrl: r.media_url,
  status: r.status,
  errorMessage: r.error_message,
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
  verified: r.verified,
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
  variants: r.variants || '',
});

export const mapKnowledgeRow = (r: KnowledgeRow): Knowledge => ({
  id: r.id,
  accountId: r.account_id,
  title: r.title,
  content: r.content,
  tags: r.tags,
});

export const mapPromoRow = (r: PromoRow): Promo => {
  let pIds = r.product_ids;
  if (typeof pIds === 'string') {
    try { pIds = JSON.parse(pIds); } catch { pIds = []; }
  }
  if (!Array.isArray(pIds)) pIds = [];

  return {
    id: r.id,
    accountId: r.account_id,
    title: r.title,
    description: r.description,
    bannerUrl: r.banner_url || '',
    productIds: pIds,
    isActive: r.is_active,
  };
};

export const mapQuickReplyRow = (r: QuickReplyRow): QuickReply => ({
  id: r.id,
  ownerId: r.owner_id,
  shortcut: r.shortcut,
  content: r.content,
});

export const mapTemplateRow = (r: TemplateRow): Template => ({
  id: r.id,
  accountId: r.account_id,
  triggerText: r.trigger_text,
  replyText: r.reply_text,
  imageUrl: r.image_url,
  variants: r.variants || '',
});
