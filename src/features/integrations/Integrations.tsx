import { useState } from 'react';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdWebhook,
  MdSmartphone,
  MdAccountBalance,
  MdSpeed,
} from 'react-icons/md';
import type { Account } from '../../App';
import './Integrations.css';

interface IntegrationsProps {
  accounts: Account[];
  onAdd: (account: Omit<Account, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Account>) => void;
  onDelete: (id: string) => void;
}

type AccountForm = Omit<Account, 'id'>;

const emptyForm: AccountForm = {
  name: '',
  phone: '',
  color: '#25D366',
  wahaSession: '',
  toggleWebhookUrl: '',
  sendMessageWebhookUrl: '',
  sendMediaWebhookUrl: '',
  analyzeWebhookUrl: '',
  confidenceThreshold: 75,
  bankAccount: '',
};

const Integrations = ({ accounts, onAdd, onUpdate, onDelete }: IntegrationsProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditingId(acc.id);
    const { id: _id, ...rest } = acc;
    void _id;
    setForm(rest);
    setIsFormOpen(true);
  };

  const closeForm = () => setIsFormOpen(false);

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Nama dan nomor WhatsApp wajib diisi.');
      return;
    }
    if (form.confidenceThreshold < 0 || form.confidenceThreshold > 100 || Number.isNaN(form.confidenceThreshold)) {
      alert('Batas Confidence harus antara 0 dan 100.');
      return;
    }
    if (editingId === null) {
      onAdd(form);
    } else {
      onUpdate(editingId, form);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (acc: Account) => {
    if (accounts.length <= 1) {
      alert('Tidak bisa menghapus akun terakhir.');
      return;
    }
    if (confirm(`Hapus akun "${acc.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
      onDelete(acc.id);
    }
  };

  const setField = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="integrations-container">
      <div className="integrations-header">
        <div>
          <h2>Pusat Koneksi</h2>
          <p className="integrations-subtitle">
            Kelola akun WhatsApp, session WAHA, dan webhook N8N untuk tiap nomor.
          </p>
        </div>
        <button className="btn-add-account" onClick={openAdd}>
          <MdAdd size={20} />
          <span>Tambah Akun</span>
        </button>
      </div>

      <div className="account-cards">
        {accounts.map(acc => (
          <div key={acc.id} className="account-card">
            <div className="account-card-head">
              <div className="account-card-title">
                <span className="account-color-dot" style={{ backgroundColor: acc.color }}></span>
                <div>
                  <h3>{acc.name}</h3>
                  <span className="account-card-phone">{acc.phone}</span>
                </div>
              </div>
              <div className="account-card-actions">
                <button className="icon-btn" title="Edit" onClick={() => openEdit(acc)}>
                  <MdEdit size={18} />
                </button>
                <button className="icon-btn danger" title="Hapus" onClick={() => handleDelete(acc)}>
                  <MdDelete size={18} />
                </button>
              </div>
            </div>

            <div className="account-card-body">
              <div className="config-row">
                <MdSmartphone size={16} className="config-icon" />
                <span className="config-label">Session WAHA</span>
                <span className="config-value">{acc.wahaSession || <em>belum diatur</em>}</span>
              </div>
              <div className="config-row">
                <MdWebhook size={16} className="config-icon" />
                <span className="config-label">Webhook Toggle</span>
                <span className={`config-value ${acc.toggleWebhookUrl ? 'ok' : 'warn'}`}>
                  {acc.toggleWebhookUrl || 'belum diatur'}
                </span>
              </div>
              <div className="config-row">
                <MdWebhook size={16} className="config-icon" />
                <span className="config-label">Webhook Kirim Teks</span>
                <span className={`config-value ${acc.sendMessageWebhookUrl ? 'ok' : 'warn'}`}>
                  {acc.sendMessageWebhookUrl || 'belum diatur'}
                </span>
              </div>
              <div className="config-row">
                <MdWebhook size={16} className="config-icon" />
                <span className="config-label">Webhook Kirim Media</span>
                <span className={`config-value ${acc.sendMediaWebhookUrl ? 'ok' : 'warn'}`}>
                  {acc.sendMediaWebhookUrl || 'belum diatur'}
                </span>
              </div>
              <div className="config-row">
                <MdWebhook size={16} className="config-icon" />
                <span className="config-label">Webhook Analisis AI</span>
                <span className={`config-value ${acc.analyzeWebhookUrl ? 'ok' : 'warn'}`}>
                  {acc.analyzeWebhookUrl || 'belum diatur'}
                </span>
              </div>
              <div className="config-row">
                <MdSpeed size={16} className="config-icon" />
                <span className="config-label">Batas Confidence</span>
                <span className="config-value">{acc.confidenceThreshold}</span>
              </div>
              <div className="config-row">
                <MdAccountBalance size={16} className="config-icon" />
                <span className="config-label">Rekening (TF)</span>
                <span className="config-value">{acc.bankAccount || <em>belum diatur</em>}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId === null ? 'Tambah Akun WhatsApp' : 'Edit Akun'}</h3>
              <button className="icon-btn" onClick={closeForm}>
                <MdClose size={20} />
              </button>
            </div>

            <div className="modal-body">
              <label className="field">
                <span className="field-label">Nama Akun</span>
                <input
                  className="field-input"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="mis. Sales Cabang 1"
                />
              </label>

              <label className="field">
                <span className="field-label">Nomor WhatsApp</span>
                <input
                  className="field-input"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="+62 8xx xxxx xxxx"
                />
              </label>

              <div className="field-grid">
                <label className="field">
                  <span className="field-label">Warna</span>
                  <input
                    type="color"
                    className="field-color"
                    value={form.color.startsWith('#') ? form.color : '#25D366'}
                    onChange={e => setField('color', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Batas Confidence (0-100)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="field-input"
                    value={form.confidenceThreshold}
                    onChange={e => setField('confidenceThreshold', Number(e.target.value))}
                  />
                </label>
              </div>

              <label className="field">
                <span className="field-label">Session WAHA</span>
                <input
                  className="field-input"
                  value={form.wahaSession}
                  onChange={e => setField('wahaSession', e.target.value)}
                  placeholder="mis. sales-cabang-1"
                />
              </label>

              <label className="field">
                <span className="field-label">Webhook Toggle (AI/Human)</span>
                <input
                  className="field-input"
                  value={form.toggleWebhookUrl}
                  onChange={e => setField('toggleWebhookUrl', e.target.value)}
                  placeholder="https://n8n.domain/webhook/toggle-akun"
                />
              </label>

              <label className="field">
                <span className="field-label">Webhook Kirim Teks</span>
                <input
                  className="field-input"
                  value={form.sendMessageWebhookUrl}
                  onChange={e => setField('sendMessageWebhookUrl', e.target.value)}
                  placeholder="https://n8n.domain/webhook/kirim-teks"
                />
              </label>

              <label className="field">
                <span className="field-label">Webhook Kirim Media</span>
                <input
                  className="field-input"
                  value={form.sendMediaWebhookUrl}
                  onChange={e => setField('sendMediaWebhookUrl', e.target.value)}
                  placeholder="https://n8n.domain/webhook/kirim-media"
                />
              </label>

              <label className="field">
                <span className="field-label">Webhook Analisis AI (rangkum percakapan)</span>
                <input
                  className="field-input"
                  value={form.analyzeWebhookUrl}
                  onChange={e => setField('analyzeWebhookUrl', e.target.value)}
                  placeholder="https://n8n.domain/webhook/analisis"
                />
              </label>

              <label className="field">
                <span className="field-label">Nomor Rekening (alur TF)</span>
                <input
                  className="field-input"
                  value={form.bankAccount}
                  onChange={e => setField('bankAccount', e.target.value)}
                  placeholder="mis. BCA 1234567890 a.n. ..."
                />
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeForm}>Batal</button>
              <button className="btn-primary" onClick={handleSave}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
