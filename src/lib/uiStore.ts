// Store UI global ringan (Zustand): notifikasi toast + status koneksi Realtime.
import { create } from 'zustand';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';
export type NotificationKind = 'info' | 'warn' | 'success' | 'error';

export interface AppNotification {
  id: string;
  text: string;
  kind: NotificationKind;
  onClick?: () => void;
}

interface UiState {
  notifications: AppNotification[];
  realtime: RealtimeStatus;
  notify: (text: string, kind?: NotificationKind, onClick?: () => void) => void;
  dismiss: (id: string) => void;
  setRealtime: (status: RealtimeStatus) => void;
}

export const useUiStore = create<UiState>((set) => ({
  notifications: [],
  realtime: 'connecting',
  notify: (text, kind = 'info', onClick) => {
    const id = crypto.randomUUID();
    set((s) => ({ notifications: [...s.notifications, { id, text, kind, onClick }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  setRealtime: (realtime) => set({ realtime }),
}));
