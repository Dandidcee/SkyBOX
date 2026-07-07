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
import type { Account } from '../../types/db';
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
  waPhoneNumberId: '',
  waAccessToken: '',
  n8nWebhookUrl: '',
  webhookUrl: '',
  confidenceThreshold: 75,
  bankAccount: '',
  adminNotifyPhone: '',
  aiEnabled: true,
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
    setForm({ ...emptyForm, ...rest });
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
            Kelola akun WhatsApp Official, Phone ID, Access Token, dan Webhook N8N (AI).
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
                <span className="config-label">WA Official Phone ID</span>
                <span className="config-value">{acc.waPhoneNumberId || <em>belum diatur</em>}</span>
              </div>
              <div className="config-row">
                <MdSmartphone size={16} className="config-icon" />
                <span className="config-label">WA Access Token</span>
                <span className={`config-value ${acc.waAccessToken ? 'ok' : 'warn'}`}>
                  {acc.waAccessToken ? 'Disembunyikan (Aktif)' : 'belum diatur'}
                </span>
              </div>
              <div className="config-row">
                <MdWebhook size={16} className="config-icon" />
                <span className="config-label">Webhook N8N (AI & Template)</span>
                <span className={`config-value ${acc.n8nWebhookUrl ? 'ok' : 'warn'}`}>
                  {acc.n8nWebhookUrl || 'belum diatur'}
                </span>
              </div>
              <div className="config-row">
                <MdSpeed size={16} className="config-icon" />
                <span className="config-label">Mode AI Aktif</span>
                <span className={`config-value ${acc.aiEnabled ? 'ok' : 'danger'}`}>
                  {acc.aiEnabled ? 'Aktif' : 'Nonaktif'}
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
              <div className="config-row">
                <MdSmartphone size={16} className="config-icon" />
                <span className="config-label">WA Admin (notif)</span>
                <span className="config-value">{acc.adminNotifyPhone || <em>belum diatur</em>}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeForm();
        }}>
          <div className="modal">
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
                  <span className="field-label">Batas Confidence</span>
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
                <span className="field-label">Phone Number ID</span>
                <input
                  className="field-input"
                  value={form.waPhoneNumberId || ''}
                  onChange={e => setField('waPhoneNumberId', e.target.value)}
                  placeholder="Contoh: 104234523456"
                />
              </label>

              <label className="field">
                <span className="field-label">Access Token</span>
                <input
                  type="password"
                  className="field-input"
                  value={form.waAccessToken || ''}
                  onChange={e => setField('waAccessToken', e.target.value)}
                  placeholder="EAAI..."
                />
              </label>

              <label className="field">
                <span className="field-label">Meta Verify Token</span>
                <input
                  type="text"
                  className="field-input"
                  value={form.metaVerifyToken || ''}
                  onChange={e => setField('metaVerifyToken', e.target.value)}
                  placeholder="misal: RAHASIA_123"
                />
              </label>

              <label className="field">
                <span className="field-label">Webhook N8N (AI & Template)</span>
                <input
                  className="field-input"
                  value={form.n8nWebhookUrl || ''}
                  onChange={e => setField('n8nWebhookUrl', e.target.value)}
                  placeholder="https://dashboard.leyatiofficial.xyz/webhook/ai-handler"
                />
              </label>

              <div 
                className="field" 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer', 
                  padding: '16px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  marginTop: '8px',
                  marginBottom: '16px'
                }} 
                onClick={() => setField('aiEnabled', form.aiEnabled === false ? true : false)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Mode AI Aktif</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Teruskan pesan masuk ke webhook N8N untuk diproses oleh AI</span>
                </div>
                <div style={{
                  width: '44px',
                  height: '24px',
                  backgroundColor: form.aiEnabled !== false ? '#25D366' : '#cbd5e1',
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'background-color 0.3s ease',
                  flexShrink: 0,
                  boxShadow: form.aiEnabled !== false ? '0 0 8px rgba(37, 211, 102, 0.4)' : 'none'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: form.aiEnabled !== false ? '22px' : '2px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              <label className="field">
                <span className="field-label">Nomor Rekening</span>
                <input
                  className="field-input"
                  value={form.bankAccount}
                  onChange={e => setField('bankAccount', e.target.value)}
                  placeholder="mis. BCA 1234567890 a.n. ..."
                />
              </label>

              <label className="field">
                <span className="field-label">Nomor WA Admin</span>
                <input
                  className="field-input"
                  value={form.adminNotifyPhone ?? ''}
                  onChange={e => setField('adminNotifyPhone', e.target.value)}
                  placeholder="mis. 6281234567890 (untuk notif takeover/bukti TF)"
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
