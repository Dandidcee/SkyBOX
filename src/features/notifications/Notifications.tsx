import { useState } from 'react';
import { MdNotificationsNone, MdDeleteSweep, MdCheckCircle, MdInfo, MdWarning, MdError, MdCheck } from 'react-icons/md';
import type { Account } from '../../types/db';
import { useNotificationsList } from '../../hooks/useNotificationsList';
import api from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';

import './Notifications.css';

interface NotificationsProps {
  accounts: Account[];
  onOpenChat?: (accountId: string, conversationId: string) => void;
}


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
      await api.delete('/notifications');
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      localStorage.removeItem('skybox_read_notifs');
      setReadIds(new Set());
    } catch { /* abaikan */ }
    setDeleting(false);
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', paddingTop: '20px' }}>
        <div className="dashboard-header" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Notifikasi</h2>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {filtered.some((n) => !readIds.has(n.id)) && (
              <button className="notif-mark-all-btn" onClick={markAllAsRead}>
                <MdCheck size={18} /> Tandai semua dibaca
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

        <div className="notif-list-card">
          <div className="notif-card-header">
            <div className="notif-tabs">
              <button className={`notif-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua</button>
              <button className={`notif-tab ${filter === 'global' ? 'active' : ''}`} onClick={() => setFilter('global')}>Sistem</button>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  className={`notif-tab ${filter === acc.id ? 'active' : ''}`}
                  onClick={() => setFilter(acc.id)}
                >
                  <span className="notif-dot" style={{ backgroundColor: acc.color }}></span>
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
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
                <div className={`notif-icon-circle ${n.level}`}>
                  {n.level === 'success' ? <MdCheckCircle size={20} /> : 
                   (n.level as string === 'warn' || n.level as string === 'warning') ? <MdWarning size={20} /> :
                   n.level === 'error' ? <MdError size={20} /> : 
                   <MdInfo size={20} />}
                </div>
                <div className="notif-body">
                  <div className="notif-message">
                    {n.message}
                  </div>
                  <div className="notif-meta">
                    {n.customerPhone && n.conversationId && (
                      <span style={{ marginRight: '8px' }}>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (n.accountId && onOpenChat) onOpenChat(n.accountId, n.conversationId!);
                          }}
                          className="notif-link"
                        >
                          {n.customerPhone}
                        </a>
                        {' • '}
                      </span>
                    )}
                    <span style={{ color: acc?.color ?? 'var(--color-text-secondary)' }}>
                      {acc ? acc.name : 'Sistem'}
                    </span>
                    {' • '}
                    {fmt(n.createdAt)}
                  </div>
                </div>
                {!isRead && <div className="notif-unread-dot"></div>}
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
};

export default Notifications;
