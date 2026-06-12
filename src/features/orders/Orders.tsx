import { useState } from 'react';
import { MdReceiptLong, MdSearch, MdVerified, MdCheck, MdChatBubbleOutline } from 'react-icons/md';
import { useQueryClient } from '@tanstack/react-query';
import type { Account } from '../../types/db';
import { useAllOrders } from '../../hooks/useAllOrders';
import { setOrderVerified } from '../../services/orders';
import '../dashboard/Dashboard.css';
import './Orders.css';

interface OrdersProps {
  accounts: Account[];
  onOpenChat?: (accountId: string, conversationId: string) => void;
}

type FilterKey = 'all' | 'closing' | 'waiting_payment' | 'verified';

const fmtDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusBadge: Record<string, string> = {
  none: 'Belum', lead: 'Lead', waiting_payment: 'Menunggu Bayar', closing: 'Closing',
};

const Orders = ({ accounts, onOpenChat }: OrdersProps) => {
  const { data: orders = [], isLoading, isError, refetch } = useAllOrders();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const accName = (id: string) => accounts.find(a => a.id === id)?.name ?? '—';
  const accColor = (id: string) => accounts.find(a => a.id === id)?.color ?? 'var(--color-text-secondary)';

  const handleVerify = async (id: string, verified: boolean) => {
    setVerifyingId(id);
    try {
      await setOrderVerified(id, verified);
      qc.invalidateQueries({ queryKey: ['orders', 'list'] });
    } catch {
      /* abaikan; realtime/refetch akan menyusul */
    } finally {
      setVerifyingId(null);
    }
  };

  const filtered = orders.filter(o => {
    if (filter === 'closing' && o.orderStatus !== 'closing') return false;
    if (filter === 'waiting_payment' && o.orderStatus !== 'waiting_payment') return false;
    if (filter === 'verified' && !o.verified) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${o.customerName} ${o.customerPhone} ${o.items} ${o.address} ${o.note}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2><MdReceiptLong size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Tracking Order</h2>
      </div>

      <div className="orders-toolbar">
        <div className="orders-tabs">
          <button className={`orders-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua</button>
          <button className={`orders-tab ${filter === 'closing' ? 'active' : ''}`} onClick={() => setFilter('closing')}>Closing</button>
          <button className={`orders-tab ${filter === 'waiting_payment' ? 'active' : ''}`} onClick={() => setFilter('waiting_payment')}>Menunggu Bayar</button>
          <button className={`orders-tab ${filter === 'verified' ? 'active' : ''}`} onClick={() => setFilter('verified')}>Terverifikasi</button>
        </div>
        <div className="orders-search">
          <MdSearch size={18} />
          <input placeholder="Cari nama / barang / alamat…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="orders-card">
        {isLoading ? (
          <div className="orders-empty">Memuat order…</div>
        ) : isError ? (
          <div className="orders-empty">Gagal memuat. <button onClick={() => refetch()}>Coba lagi</button></div>
        ) : filtered.length === 0 ? (
          <div className="orders-empty">Belum ada order.</div>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Tanggal Order</th>
                  <th>Pelanggan</th>
                  <th>No HP</th>
                  <th>Akun</th>
                  <th>Barang Dipesan</th>
                  <th>Alamat</th>
                  <th>Catatan Pengiriman</th>
                  <th>Metode</th>
                  <th>Nominal</th>
                  <th>Fase</th>
                  <th>Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className={o.verified ? 'ord-verified-row' : ''}>
                    <td className="ord-date">{fmtDate(o.createdAt)}</td>
                    <td><div className="ord-cust">{o.customerName || o.customerPhone || '-'}</div></td>
                    <td className="ord-phone-col">
                      {o.customerPhone ? (
                        <button
                          className="ord-phone-link"
                          onClick={() => onOpenChat?.(o.accountId, o.conversationId)}
                          title="Buka chat percakapan ini"
                        >
                          <MdChatBubbleOutline size={13} />
                          {o.customerPhone}
                        </button>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="ord-acc">
                        <span className="ord-dot" style={{ backgroundColor: accColor(o.accountId) }}></span>
                        {accName(o.accountId)}
                      </span>
                    </td>
                    <td className="ord-items">{o.items || '-'}</td>
                    <td className="ord-addr">{o.address || '-'}</td>
                    <td className="ord-note">{o.note || '-'}</td>
                    <td><span className={`ord-method ${o.type}`}>{o.type === 'tf' ? 'Transfer' : 'COD'}</span></td>
                    <td className="ord-amount">{o.amount != null ? `Rp ${o.amount.toLocaleString('id-ID')}` : '-'}</td>
                    <td><span className={`ord-phase ${o.orderStatus}`}>{statusBadge[o.orderStatus] ?? o.orderStatus ?? '-'}</span></td>
                    <td>
                      {o.verified ? (
                        <button
                          className="ord-verified-badge"
                          onClick={() => handleVerify(o.id, false)}
                          disabled={verifyingId === o.id}
                          title="Klik untuk batalkan verifikasi"
                        >
                          <MdVerified size={15} /> Terverifikasi
                        </button>
                      ) : (
                        <button
                          className="ord-verify-btn"
                          onClick={() => handleVerify(o.id, true)}
                          disabled={verifyingId === o.id}
                        >
                          <MdCheck size={15} /> {verifyingId === o.id ? '…' : 'Verifikasi'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
