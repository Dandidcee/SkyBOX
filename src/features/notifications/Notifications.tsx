import { useState } from 'react';
import { MdNotificationsNone } from 'react-icons/md';
import type { Account } from '../../App';
import { useNotificationsList } from '../../hooks/useNotificationsList';
import '../dashboard/Dashboard.css';
import './Notifications.css';

interface NotificationsProps {
  accounts: Account[];
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

const Notifications = ({ accounts }: NotificationsProps) => {
  const { data: items = [], isLoading, isError, refetch } = useNotificationsList();
  const [filter, setFilter] = useState<Filter>('all');

  const accountById = (id: string | null) => (id ? accounts.find(a => a.id === id) : undefined);

  const filtered = items.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'global') return !n.accountId;
    return n.accountId === filter;
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Notifikasi</h2>
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
            return (
              <div key={n.id} className="notif-item">
                <span className={`notif-badge ${n.level}`}>{levelLabel[n.level] ?? n.level}</span>
                <div className="notif-body">
                  <div className="notif-message">{n.message}</div>
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
