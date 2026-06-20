import { useState } from 'react';
import { MdClose, MdPhone, MdAutoAwesome, MdContentCopy } from 'react-icons/md';
import type { Account, Conversation, Order } from '../../types/db';
import { analyzeConversation } from '../../services/n8n';
import './ContactPanel.css';

interface ContactPanelProps {
  account: Account;
  conversation: Conversation;
  latestOrder: Order | null;
  onClose: () => void;
}

const confColor = (p: number) => (p >= 85 ? '#3B82F6' : p >= 75 ? '#EAB308' : '#EF4444');
const confLabel = (p: number) => (p >= 85 ? 'Yakin' : p >= 75 ? 'Cukup Yakin' : 'Butuh Bantuan');
const statusLabel: Record<string, string> = {
  none: 'Belum ada', lead: 'Lead', waiting_payment: 'Menunggu Bayar', closing: 'Closing',
};

const ContactPanel = ({ account, conversation, latestOrder, onClose }: ContactPanelProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = conversation.customerName || conversation.customerPhone;
  const initial = name.charAt(0).toUpperCase();

  const handleAnalyze = async () => {
    setLoading(true); setError(null); setSummary(null);
    try {
      const result = await analyzeConversation(account, {
        conversationId: conversation.id,
        phone: conversation.customerPhone,
        chatId: conversation.chatId,
      });
      setSummary(result || '(ringkasan kosong)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menganalisis percakapan.');
    } finally {
      setLoading(false);
    }
  };

  const copyPhone = () => navigator.clipboard?.writeText(conversation.customerPhone).catch(() => {});

  return (
    <div className="contact-panel">
      <div className="contact-panel-head">
        <span>Info Kontak</span>
        <button className="cp-close" onClick={onClose} title="Tutup"><MdClose size={20} /></button>
      </div>

      <div className="contact-panel-body">
        {/* Identitas */}
        <div className="cp-identity">
          <div className="cp-avatar" style={{ borderColor: confColor(conversation.confidence) }}>{initial}</div>
          <div className="cp-name">{name}</div>
          <div className="cp-account">
            <span className="cp-dot" style={{ backgroundColor: account.color }}></span>
            via {account.name}
          </div>
        </div>

        {/* Nomor HP */}
        <div className="cp-section">
          <div className="cp-row">
            <MdPhone size={16} className="cp-icon" />
            <span className="cp-row-label">No. HP</span>
            <span className="cp-row-value">{conversation.customerPhone}</span>
            <button className="cp-copy" onClick={copyPhone} title="Salin nomor"><MdContentCopy size={14} /></button>
          </div>
        </div>

        {/* Status */}
        <div className="cp-section">
          <div className="cp-stat">
            <span className="cp-stat-label">Penanganan</span>
            <span className={`cp-badge ${conversation.handler === 'human' ? 'human' : 'ai'}`}>
              {conversation.handler === 'human' ? 'Manusia' : 'AI'}
            </span>
          </div>
          <div className="cp-stat">
            <span className="cp-stat-label">Confidence</span>
            <span className="cp-conf" style={{ color: confColor(conversation.confidence) }}>
              {conversation.confidence} · {confLabel(conversation.confidence)}
            </span>
          </div>
          <div className="cp-stat">
            <span className="cp-stat-label">Fase Order</span>
            <span className="cp-stat-value">{statusLabel[conversation.orderStatus] ?? conversation.orderStatus}</span>
          </div>
        </div>

        {/* Order terakhir */}
        {latestOrder && (
          <div className="cp-section">
            <div className="cp-section-title">Order Terakhir</div>
            <div className="cp-stat">
              <span className="cp-stat-label">Tipe</span>
              <span className="cp-stat-value">{latestOrder.type === 'tf' ? 'Transfer' : 'COD'}</span>
            </div>
            <div className="cp-stat">
              <span className="cp-stat-label">Status</span>
              <span className="cp-stat-value">{latestOrder.status}</span>
            </div>
            {latestOrder.amount != null && (
              <div className="cp-stat">
                <span className="cp-stat-label">Nominal</span>
                <span className="cp-stat-value">Rp {latestOrder.amount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {latestOrder.address && (
              <div className="cp-stat">
                <span className="cp-stat-label">Alamat</span>
                <span className="cp-stat-value">{latestOrder.address}</span>
              </div>
            )}
          </div>
        )}

        {/* Analisis AI */}
        <div className="cp-section">
          <button className="cp-analyze-btn" onClick={handleAnalyze} disabled={loading}>
            <MdAutoAwesome size={18} />
            <span>{loading ? 'Menganalisis…' : 'Analisis AI (Rangkum Percakapan)'}</span>
          </button>
          <p className="cp-analyze-hint">Rangkum percakapan biar cepat paham konteks saat ambil alih.</p>
          {error && <div className="cp-error">{error}</div>}
          {summary && <div className="cp-summary">{summary}</div>}
        </div>
      </div>
    </div>
  );
};

export default ContactPanel;
