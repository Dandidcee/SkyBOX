// Update order dari dashboard (CS verifikasi). RLS: hanya order milik akun admin.
import api from './api';

export async function setOrderVerified(id: string, verified: boolean): Promise<void> {
  await api.put(`/resource/orders/${id}`, { verified });
}

export async function deleteOrder(id: string): Promise<void> {
  await api.delete(`/resource/orders/${id}`);
}
