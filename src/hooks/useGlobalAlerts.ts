import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { useUiStore } from '../lib/uiStore';
import { playEventSound } from '../lib/soundStore';
// import { wasSelfHandlerChange } from '../lib/selfActions';
import type { Account } from '../types/db';

export function useGlobalAlerts(accounts: Account[], enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || accounts.length === 0) return;
    const { notify, setRealtime } = useUiStore.getState();
    const socket = getSocket();

    // Koneksi ke semua akun yang ada
    accounts.forEach(acc => {
      connectSocket(acc.id);
    });

    socket.on('connect', () => {
      setRealtime('connected');
    });

    socket.on('disconnect', () => {
      setRealtime('disconnected');
    });

    socket.on('connect_error', () => {
      setRealtime('disconnected');
    });

    socket.on('conversation_updated', () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('new_message', (msgRow) => {
      // Invalidate pesan untuk conversation id tsb
      qc.invalidateQueries({ queryKey: ['messages', msgRow.conversation_id] });
      
      if (msgRow.direction === 'in') {
        let customerName = 'Pelanggan';
        let accName = '';
        
        for (const acc of accounts) {
          // Note: we use 'any' here just to safely check the cache structure since it might be Conversation or ConversationRow
          const convs = qc.getQueryData<any[]>(['conversations', acc.id]);
          if (convs) {
            const conv = convs.find(c => c.id === msgRow.conversation_id);
            if (conv) {
              customerName = conv.customerName || conv.customer_name || conv.customerPhone || conv.customer_phone || 'Pelanggan';
              accName = acc.name;
              break;
            }
          }
        }
        
        const prefix = accName ? `[${accName}] ` : '';
        notify(`${prefix}Pesan baru dari ${customerName}`, 'info');
        playEventSound('incoming');
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('conversation_updated');
      socket.off('new_message');
      disconnectSocket();
    };
  }, [accounts, qc, enabled]);
}
