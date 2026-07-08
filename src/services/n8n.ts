import api from './api';
import type { Account } from '../types/db';

export type ConversationHandler = 'ai' | 'human';
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export async function setConversationHandler(
  _account: Account,
  payload: { conversationId: string; phone: string; chatId: string; handler: ConversationHandler }
): Promise<void> {
  await api.put(`/conversations/${payload.conversationId}/handler`, { handler: payload.handler });
}

export async function sendTextMessage(
  _account: Account,
  payload: { conversationId: string; phone: string; chatId: string; text: string; replyToMessageId?: string | null }
): Promise<void> {
  await api.post('/messages', {
    conversationId: payload.conversationId,
    body: payload.text,
    type: 'text',
    replyToMessageId: payload.replyToMessageId
  });
}

export async function sendMedia(
  _account: Account,
  payload: { conversationId: string; phone: string; chatId: string; mediaType: MediaType; filename: string; caption?: string; mediaUrl: string; replyToMessageId?: string | null }
): Promise<void> {
  await api.post('/messages', {
    conversationId: payload.conversationId,
    body: payload.caption || `[${payload.mediaType}]`,
    type: payload.mediaType,
    mediaUrl: payload.mediaUrl,
    replyToMessageId: payload.replyToMessageId
  });
}

export async function analyzeConversation(_account: any, _data: any): Promise<string> {
  // Fitur analyze dinonaktifkan karena sekarang berjalan native
  return "Fitur ringkasan AI dinonaktifkan dalam mode Native.";
}
