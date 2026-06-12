import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import Inbox from './features/inbox/Inbox';
import Dashboard from './features/dashboard/Dashboard';
import Integrations from './features/integrations/Integrations';
import Analytics from './features/analytics/Analytics';
import Settings from './features/settings/Settings';
import Notifications from './features/notifications/Notifications';
import Login from './features/auth/Login';
import LoadingScreen from './components/LoadingScreen';
import NotificationHost from './components/NotificationHost';
import { useAccounts, useAccountMutations } from './hooks/useAccounts';
import { useSystemNotifications } from './hooks/useSystemNotifications';
import { isSupabaseConfigured } from './services/supabase';
import { getSession, onAuthChange, signOut } from './services/auth';
import type { Session } from '@supabase/supabase-js';
import type { Account, OrderStatus } from './types/db';
import './App.css';

// Sumber kebenaran tipe ada di src/types/db.ts; re-export agar impor lama tetap jalan.
export type { Account, OrderStatus };

const stateStyle: React.CSSProperties = {
  padding: '24px',
  color: 'var(--color-text-secondary)',
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeAccountIds, setActiveAccountIds] = useState<string[]>([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);

  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading: accountsLoading, isError: accountsError, refetch } = useAccounts();
  const { add, update, remove } = useAccountMutations();

  useSystemNotifications(accounts);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auth: muat session awal + dengarkan perubahan login/logout.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSession()
      .then(setSession)
      .finally(() => setAuthReady(true));
    const unsub = onAuthChange((s) => {
      setSession(s);
      queryClient.invalidateQueries(); // refetch data dgn JWT yang baru
    });
    return unsub;
  }, [queryClient]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      /* abaikan */
    }
  };

  // Pilih akun aktif default saat daftar akun termuat / berubah.
  const maxCols = windowWidth >= 1440 ? 4 : windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1;

  // Akun aktif terpilih, dengan fallback ke akun pertama (derive saat render, bukan setState di effect).
  const resolvedActiveIds = (() => {
    const valid = activeAccountIds.filter(id => accounts.some(a => a.id === id));
    if (valid.length) return valid;
    return accounts[0] ? [accounts[0].id] : [];
  })();

  const toggleAccount = (id: string) => {
    const prev = resolvedActiveIds;
    if (prev.includes(id)) {
      if (prev.length === 1) return; // minimal 1 akun terbuka
      setActiveAccountIds(prev.filter(a => a !== id));
      return;
    }
    let maxAccounts = 1;
    if (windowWidth >= 1440) maxAccounts = 4;
    else if (windowWidth >= 1024) maxAccounts = 3;
    else if (windowWidth >= 768) maxAccounts = 2;
    if (prev.length >= maxAccounts) {
      alert(`Maaf, maksimal yang bisa dibuka di layar Anda sekarang adalah ${maxAccounts} akun.`);
      return;
    }
    setActiveAccountIds([...prev, id]);
  };

  const activeAccounts = resolvedActiveIds
    .map(id => accounts.find(a => a.id === id))
    .filter((a): a is Account => Boolean(a));
  const effectiveCols = Math.max(1, Math.min(activeAccounts.length, maxCols));
  const colWidthPct = `calc(${100 / effectiveCols}% - ${(3 * (effectiveCols - 1)) / effectiveCols}px)`;

  if (isLoading) {
    return <LoadingScreen onFinish={() => setIsLoading(false)} />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div style={{ ...stateStyle, color: 'var(--color-text-primary)' }}>
        <h2>Konfigurasi Supabase belum ada</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
          Set <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>, lalu jalankan ulang dev server.
        </p>
      </div>
    );
  }

  // Belum siap cek auth → tampilkan loading singkat.
  if (!authReady) {
    return <div style={stateStyle}>Memuat…</div>;
  }

  // Belum login → halaman Login.
  if (!session) {
    return <Login />;
  }

  return (
    <div className={`app-layout ${mobileChatOpen ? 'mobile-chat-open' : ''}`}>
      <NotificationHost />
      <Sidebar
        isVisible={isSidebarVisible}
        toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        accounts={accounts}
        activeAccountIds={resolvedActiveIds}
        toggleAccount={toggleAccount}
        onRenameAccount={(id, name) => update.mutate({ id, patch: { name } })}
        activeView={activeView}
        setActiveView={setActiveView}
        userEmail={session.user?.email ?? ''}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {activeView === 'dashboard' ? (
          <Dashboard accounts={accounts} />
        ) : activeView === 'analytics' ? (
          <Analytics accounts={accounts} />
        ) : activeView === 'notifications' ? (
          <Notifications accounts={accounts} />
        ) : activeView === 'settings' ? (
          <Settings setActiveView={setActiveView} />
        ) : activeView === 'integrations' ? (
          <Integrations
            accounts={accounts}
            onAdd={(data) => add.mutate(data)}
            onUpdate={(id, patch) => update.mutate({ id, patch })}
            onDelete={(id) => remove.mutate(id)}
          />
        ) : activeView === 'inbox' ? (
          accountsLoading ? (
            <div style={stateStyle}>Memuat akun…</div>
          ) : accountsError ? (
            <div style={stateStyle}>
              Gagal memuat akun.{' '}
              <button onClick={() => refetch()}>Coba lagi</button>
            </div>
          ) : activeAccounts.length === 0 ? (
            <div style={stateStyle}>Belum ada akun WhatsApp. Tambahkan di menu Integrations.</div>
          ) : (
            activeAccounts.map((account) => (
              <Inbox
                key={`${account.id}-${activeView}`}
                account={account}
                isMultiView={activeAccounts.length > 1}
                colWidth={colWidthPct}
                onMobileChatOpenChange={setMobileChatOpen}
              />
            ))
          )
        ) : (
          <div style={{ padding: '24px', color: 'var(--color-text-primary)' }}>
            <h2>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>This view is under construction.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
