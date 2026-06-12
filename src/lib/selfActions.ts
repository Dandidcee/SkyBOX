// Menandai aksi yang dipicu CS sendiri (mis. toggle ke Human), agar listener
// Realtime tidak memunculkan notifikasi "palsu" untuk aksi yang baru saja dilakukan user.
const recent = new Map<string, number>();
const TTL_MS = 8000;

export function markSelfHandlerChange(conversationId: string): void {
  recent.set(conversationId, Date.now() + TTL_MS);
}

/** True bila perubahan handler conversation ini baru saja dipicu CS (sekali pakai). */
export function wasSelfHandlerChange(conversationId: string): boolean {
  const exp = recent.get(conversationId);
  if (!exp) return false;
  recent.delete(conversationId); // consume
  return Date.now() <= exp;
}
