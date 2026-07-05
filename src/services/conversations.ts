import api from './api';

export async function deleteConversations(ids: string[]): Promise<void> {
  if (!ids.length) return;
  
  await api.post('/conversations/bulk-delete', { ids });
}
