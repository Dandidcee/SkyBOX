import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import { useUiStore } from '../lib/uiStore';
import { playEventSound } from '../lib/soundStore';
// import { wasSelfHandlerChange } from '../lib/selfActions';
import type { Account, ConversationRow } from '../types/db';

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

    socket.on('conversation_updated', (newRow: ConversationRow) => {
      // Asumsikan payload ini adalah data baru yang di-update
      const label = newRow.customer_name || newRow.customer_phone || 'Pelanggan';
      const accName = accounts.find((a) => a.id === newRow.account_id)?.name;
      const prefix = accName ? `[${accName}] ` : '';

      // Untuk notifikasi unread naik (dari backend, saat ini kita tidak kirim oldRow, tapi hanya kirim saat ada pesan masuk)
      // Karena kita trigger ini di Meta webhook, ini pasti ada unread naik.
      notify(`${prefix}Pesan baru dari ${label}`, 'info');
      playEventSound('incoming');

      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('new_message', (msgRow) => {
      // Invalidate pesan untuk conversation id tsb
      qc.invalidateQueries({ queryKey: ['messages', msgRow.conversation_id] });
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
