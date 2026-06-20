import { useState } from 'react';
import { MdNotificationsNone, MdDeleteSweep } from 'react-icons/md';
import type { Account } from '../../types/db';
import { useNotificationsList } from '../../hooks/useNotificationsList';
import { getSupabase } from '../../services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import '../dashboard/Dashboard.css';
import './Notifications.css';

interface NotificationsProps {
  accounts: Account[];
  onOpenChat?: (accountId: string, conversationId: string) => void;
}

const levelLabel: Record<string, string> = {
  info: 'Info',
  success: 'Sukses',
  warn: 'Peringatan',
  error: 'Error',
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// 'all' = semua, 'global' = tanpa akun (sistem), atau accountId tertentu
type Filter = 'all' | 'global' | string;

const Notifications = ({ accounts, onOpenChat }: NotificationsProps) => {
  const { data: items = [], isLoading, isError, refetch } = useNotificationsList();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState(false);

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('skybox_read_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const accountById = (id: string | null) => (id ? accounts.find(a => a.id === id) : undefined);

  const filtered = items.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'global') return !n.accountId;
    return n.accountId === filter;
  });

  const markAsRead = (id: string) => {
    if (readIds.has(id)) return;
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem('skybox_read_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const markAllAsRead = () => {
    const allIds = filtered.map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set([...prev, ...allIds]);
      localStorage.setItem('skybox_read_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const handleDeleteAll = async () => {
    if (!confirm('Hapus semua notifikasi? Tindakan ini tidak bisa dibatalkan.')) return;
    setDeleting(true);
    try {
      // Hapus semua notifikasi (RLS scoped — hanya milik admin ini yang kena)
      await getSupabase().from('notifications').delete().gte('created_at', '1970-01-01');
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      localStorage.removeItem('skybox_read_notifs');
      setReadIds(new Set());
    } catch { /* abaikan */ }
    setDeleting(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Notifikasi</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {filtered.some((n) => !readIds.has(n.id)) && (
            <button className="notif-mark-all-btn" onClick={markAllAsRead}>
              Tandai semua dibaca
            </button>
          )}
          {filtered.length > 0 && (
            <button className="notif-delete-all-btn" onClick={handleDeleteAll} disabled={deleting}>
              <MdDeleteSweep size={18} />
              <span>{deleting ? '…' : 'Hapus Semua'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter per akun */}
      <div className="notif-filters">
        <button className={`notif-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua</button>
        <button className={`notif-chip ${filter === 'global' ? 'active' : ''}`} onClick={() => setFilter('global')}>Sistem</button>
        {accounts.map(acc => (
          <button
            key={acc.id}
            className={`notif-chip ${filter === acc.id ? 'active' : ''}`}
            onClick={() => setFilter(acc.id)}
          >
            <span className="notif-dot" style={{ backgroundColor: acc.color }}></span>
            {acc.name}
          </button>
        ))}
      </div>

      <div className="notif-list-card">
        {isLoading ? (
          <div className="notif-empty">Memuat…</div>
        ) : isError ? (
          <div className="notif-empty">Gagal memuat. <button onClick={() => refetch()}>Coba lagi</button></div>
        ) : filtered.length === 0 ? (
          <div className="notif-empty">
            <MdNotificationsNone size={28} />
            <span>Belum ada notifikasi.</span>
          </div>
        ) : (
          filtered.map(n => {
            const acc = accountById(n.accountId);
            const isRead = readIds.has(n.id);
            return (
              <div 
                key={n.id} 
                className={`notif-item ${!isRead ? 'unread' : ''}`}
                onClick={() => !isRead && markAsRead(n.id)}
              >
                <span className={`notif-badge ${n.level}`}>{levelLabel[n.level] ?? n.level}</span>
                <div className="notif-body">
                  <div className="notif-message">
                    {n.message}
                    {n.customerPhone && n.conversationId && (
                      <>
                        {' — '}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (n.accountId && onOpenChat) onOpenChat(n.accountId, n.conversationId!);
                          }}
                          style={{ color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'underline' }}
                        >
                          {n.customerPhone}
                        </a>
                      </>
                    )}
                  </div>
                  <div className="notif-meta">
                    <span className="notif-dot" style={{ backgroundColor: acc?.color ?? 'var(--color-text-secondary)' }}></span>
                    {acc ? acc.name : 'Sistem'} · {fmt(n.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
