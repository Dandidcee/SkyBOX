import { useEffect } from 'react';
import type { Account } from '../types/db';

export function useSystemNotifications(accounts: Account[]) {
  useEffect(() => {
    // Realtime for system notifications is disabled after migrating from Supabase.
    // If needed in the future, we can add a 'new_notification' event to socket.io.
  }, [accounts]);
}
