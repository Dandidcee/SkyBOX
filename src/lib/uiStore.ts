// Store UI global ringan (Zustand): notifikasi toast + status koneksi Realtime.
import { create } from 'zustand';
import { toast } from 'sonner';

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
  notify: (text: string, kind?: NotificationKind, onClick?: () => void, description?: string) => void;
  dismiss: (id: string) => void;
  setRealtime: (status: RealtimeStatus) => void;
}

export const useUiStore = create<UiState>((set) => ({
  notifications: [],
  realtime: 'connecting',
  notify: (text, kind = 'info', onClick, description) => {
    const options: any = {};
    if (onClick) options.action = { label: 'Buka', onClick };
    if (description) options.description = description;
    switch (kind) {
      case 'success':
        toast.success(text, options);
        break;
      case 'error':
        toast.error(text, options);
        break;
      case 'warn':
        toast.warning(text, options);
        break;
      default:
        toast.info(text, options);
        break;
    }
  },
  dismiss: (id) => toast.dismiss(id),
  setRealtime: (realtime) => set({ realtime }),
}));
