import { useState } from 'react';
import { toast } from 'sonner';
import { MdReceiptLong, MdSearch, MdVerified, MdCheck, MdChatBubbleOutline, MdPictureAsPdf, MdGridOn } from 'react-icons/md';
import { useQueryClient } from '@tanstack/react-query';
import type { Account } from '../../types/db';
import { useAllOrders } from '../../hooks/useAllOrders';
import { setOrderVerified, deleteOrder } from '../../services/orders';
import { exportOrdersCSV, printOrdersPDF, type ExportOrderRow } from '../../lib/exportOrders';

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

  const handleReject = async (id: string) => {
    if (!window.confirm('Yakin ingin menolak dan menghapus order ini?')) return;
    setVerifyingId(id); // reuse state for loading
    try {
      await deleteOrder(id);
      qc.invalidateQueries({ queryKey: ['orders', 'list'] });
    } catch {
      toast.error('Gagal menghapus order.');
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

  const filterTitle: Record<FilterKey, string> = {
    all: 'Tracking Order — Semua',
    closing: 'Tracking Order — Closing',
    waiting_payment: 'Tracking Order — Menunggu Bayar',
    verified: 'Tracking Order — Terverifikasi',
  };

  const buildExportRows = (): ExportOrderRow[] => filtered.map(o => ({
    createdAt: o.createdAt,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    account: accName(o.accountId),
    items: o.items,
    address: o.address,
    note: o.note,
    method: o.type === 'tf' ? 'Transfer' : 'COD',
    amount: o.amount,
    phase: statusBadge[o.orderStatus] ?? o.orderStatus ?? '-',
    verified: o.verified,
  }));

  const handleExportPDF = () => printOrdersPDF(buildExportRows(), filterTitle[filter]);
  const handleExportCSV = () => exportOrdersCSV(buildExportRows(), `tracking-order-${filter}`);

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
        <div className="orders-export">
          <button className="orders-export-btn pdf" onClick={handleExportPDF} disabled={filtered.length === 0} title="Cetak PDF">
            <MdPictureAsPdf size={16} /> PDF
          </button>
          <button className="orders-export-btn excel" onClick={handleExportCSV} disabled={filtered.length === 0} title="Export Excel (CSV)">
            <MdGridOn size={16} /> Excel
          </button>
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
                  <th className="col-date">Tanggal Order</th>
                  <th className="col-cust">Pelanggan</th>
                  <th className="col-phone">No HP</th>
                  <th className="col-acc">Akun</th>
                  <th className="col-items">Barang Dipesan</th>
                  <th className="col-addr">Alamat</th>
                  <th className="col-note">Catatan Pengiriman</th>
                  <th className="col-method">Metode</th>
                  <th className="col-amount">Nominal</th>
                  <th className="col-phase">Fase</th>
                  <th className="col-verify">Verifikasi</th>
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
                      <div className="ord-actions">
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
                        {!o.verified && (
                          <button
                            className="ord-reject-btn"
                            onClick={() => handleReject(o.id)}
                            disabled={verifyingId === o.id}
                            title="Tolak & Hapus"
                          >
                            ✕
                          </button>
                        )}
                      </div>
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
