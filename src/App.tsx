import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MdMenu } from 'react-icons/md';
import api from './services/api';
import Sidebar from './components/layout/Sidebar';
import Inbox from './features/inbox/Inbox';
import Dashboard from './features/dashboard/Dashboard';
import Integrations from './features/integrations/Integrations';
import Analytics from './features/analytics/Analytics';
import Catalog from './features/catalog/Catalog';
import Orders from './features/orders/Orders';
import Ongkir from './features/ongkir/Ongkir';
import QuickReplies from './features/quickreplies/QuickReplies';
import Settings from './features/settings/Settings';
import Notifications from './features/notifications/Notifications';
import Contacts from './features/contacts/Contacts';
import Templates from './features/templates/Templates';
import Login from './features/auth/Login';
import ResetPassword from './features/auth/ResetPassword';
import NotificationHost from './components/NotificationHost';
import { useAccounts, useAccountMutations } from './hooks/useAccounts';
import { useSystemNotifications } from './hooks/useSystemNotifications';
import { useGlobalAlerts } from './hooks/useGlobalAlerts';
import { useAllConversations } from './hooks/useAllConversations';
import { useNotificationsList } from './hooks/useNotificationsList';
import { getSession, onAuthChange, signOut, type Session } from './services/auth';
import type { Account, OrderStatus } from './types/db';
import './App.css';

// Sumber kebenaran tipe ada di src/types/db.ts; re-export agar impor lama tetap jalan.
export type { Account, OrderStatus };

const stateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  padding: '24px',
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
  fontSize: '15px',
};

function App() {
  const [activeView, setActiveView] = useState<string>(() => localStorage.getItem('skybox_active_view') || 'dashboard');
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => window.innerWidth > 768);
  const [activeAccountIds, setActiveAccountIds] = useState<string[]>([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [chatFocus, setChatFocus] = useState<{ accountId: string; conversationId: string } | null>(null);

  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading: accountsLoading, isError: accountsError, refetch } = useAccounts(!!session);
  const { add, update, remove } = useAccountMutations();

  useSystemNotifications(accounts);
  useGlobalAlerts(accounts, !!session);

  // Badge unread counts
  const { data: allConvs = [] } = useAllConversations(!!session);
  const { data: allNotifs = [] } = useNotificationsList(!!session);
  const unreadChats = allConvs.reduce((sum, c) => sum + (c.unread ?? 0), 0);
  const readNotifIds = (() => { try { return new Set(JSON.parse(localStorage.getItem('skybox_read_notifs') || '[]')); } catch { return new Set(); } })();
  const unreadNotifs = allNotifs.filter(n => !readNotifIds.has(n.id)).length;

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('skybox_active_view', activeView);
  }, [activeView]);

  // Sync activeView with browser history for mobile back button support
  useEffect(() => {
    // Initial replaceState so we have a base state
    window.history.replaceState({ view: activeView }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setActiveView(prev => {
          if (prev !== e.state.view) {
            return e.state.view;
          }
          return prev;
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Only run once on mount to attach listener

  // Auth: muat session awal + dengarkan perubahan login/logout.
  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setAuthReady(true));
    const unsub = onAuthChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // Refetch data hanya saat login/logout (bukan tiap refresh token).
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') queryClient.invalidateQueries();
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

  // Buka chat tertentu (mis. dari Tracking Order klik No HP).
  const handleOpenChat = (accountId: string, conversationId: string) => {
    goView('inbox');
    setChatFocus({ accountId, conversationId });
    
    // Pastikan akun dari notifikasi terbuka tanpa menutup akun lain
    setActiveAccountIds(prev => {
      // Jika akun sudah terbuka, biarkan saja
      if (prev.includes(accountId)) return prev;
      
      let maxAccounts = 1;
      if (window.innerWidth >= 1440) maxAccounts = 4;
      else if (window.innerWidth >= 1024) maxAccounts = 3;
      else if (window.innerWidth >= 768) maxAccounts = 2;

      // Jika jumlah tab sudah maksimal, ganti tab paling lama (index 0) dengan yang baru
      if (prev.length >= maxAccounts) {
        return [...prev.slice(1), accountId];
      }
      return [...prev, accountId];
    });
  };

  // Navigasi view manual (sidebar/menu) — bersihkan fokus chat agar Inbox tidak
  // lompat ke percakapan lama saat dibuka ulang.
  const goView = (v: string) => {
    setChatFocus(null);
    if (v !== activeView) {
      window.history.pushState({ view: v }, '');
      setActiveView(v);
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
    if (maxAccounts === 1) {
      setActiveAccountIds([id]);
      return;
    }

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

  // Fitur "Klik Link Otomatis Chat" (dashboard.leyatiofficial.xyz/?phone=628xxx&name=Budi)
  useEffect(() => {
    if (!authReady || !session || accounts.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    if (!phone) return;

    const name = params.get('name') || 'Pelanggan Baru';
    const accountId = params.get('accountId') || accounts[0].id;

    // Hapus parameter dari URL biar nggak kerender ulang
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);

    // Bikin chat baru lewat API
    api.post<{id: string}>('/conversations/start', { accountId, phone, name })
      .then(res => {
        queryClient.invalidateQueries({ queryKey: ['conversations', accountId] });
        setTimeout(() => {
          handleOpenChat(accountId, res.data.id);
        }, 300); // tambah sedikit delay agar cache pasti update
      })
      .catch(err => {
        console.error('Gagal memulai chat dari link', err);
        alert('Gagal memulai chat otomatis. Pastikan format nomor benar (628...).');
      });
  }, [authReady, session, accounts.length, queryClient]);

  // Belum siap cek auth → tampilkan loading singkat.
  if (!authReady) {
    return <div style={stateStyle}>Memuat…</div>;
  }

  // Mode recovery (dari link reset password di email) → set sandi baru.
  if (recovery) {
    return <ResetPassword onDone={() => setRecovery(false)} />;
  }

  // Belum login → halaman Login.
  if (!session) {
    return <Login />;
  }

  return (
    <div className={`app-layout ${mobileChatOpen ? 'mobile-chat-open' : ''}`}>
      <NotificationHost />
      
      {/* Header Khusus Mobile */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setIsSidebarVisible(true)}>
          <MdMenu />
        </button>
        <span className="mobile-header-title">SkyBox Dashboard</span>
      </div>

      {/* Overlay untuk sidebar di mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarVisible ? 'active' : ''}`}
        onClick={() => setIsSidebarVisible(false)}
      />

      <Sidebar
        isVisible={isSidebarVisible}
        toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        accounts={accounts}
        activeAccountIds={resolvedActiveIds}
        toggleAccount={toggleAccount}
        onRenameAccount={(id, name) => update.mutate({ id, patch: { name } })}
        activeView={activeView}
        setActiveView={goView}
        userEmail={session.user?.email ?? ''}
        onLogout={handleLogout}
        unreadChats={unreadChats}
        unreadNotifs={unreadNotifs}
      />
      <main className="main-content">
        {activeView === 'dashboard' ? (
          <Dashboard accounts={accounts} />
        ) : activeView === 'analytics' ? (
          <Analytics accounts={accounts} />
        ) : activeView === 'catalog' ? (
          <Catalog accounts={accounts} />
        ) : activeView === 'orders' ? (
          <Orders accounts={accounts} onOpenChat={handleOpenChat} />
        ) : activeView === 'ongkir' ? (
          <Ongkir />
        ) : activeView === 'quickreplies' ? (
          <QuickReplies />
        ) : activeView === 'templates' ? (
          <Templates accounts={accounts} />
        ) : activeView === 'contacts' ? (
          <Contacts accounts={accounts} onOpenChat={handleOpenChat} />
        ) : activeView === 'notifications' ? (
          <Notifications accounts={accounts} onOpenChat={handleOpenChat} />
        ) : activeView === 'settings' ? (
          <Settings setActiveView={goView} />
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
                key={`${account.id}-${activeView}-${chatFocus?.accountId === account.id ? chatFocus.conversationId : ''}`}
                account={account}
                isMultiView={activeAccounts.length > 1}
                colWidth={colWidthPct}
                onMobileChatOpenChange={setMobileChatOpen}
                initialConversationId={chatFocus?.accountId === account.id ? chatFocus.conversationId : undefined}
                onNavigate={goView}
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
