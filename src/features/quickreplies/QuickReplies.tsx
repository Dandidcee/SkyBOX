import { useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdFlashOn, MdClose } from 'react-icons/md';
import { useQuickReplies, useAddQuickReply, useUpdateQuickReply, useDeleteQuickReply } from './../../hooks/useQuickReplies';
import type { QuickReply } from './../../types/db';

import '../catalog/Catalog.css';

export default function QuickReplies() {
  const { data: quickReplies = [], isLoading, isError } = useQuickReplies();
  const addMutation = useAddQuickReply();
  const updateMutation = useUpdateQuickReply();
  const deleteMutation = useDeleteQuickReply();

  const [form, setForm] = useState<Partial<QuickReply> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setForm(null);
      setIsClosing(false);
    }, 200);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ shortcut: '', content: '' });
  };

  const openEdit = (qr: QuickReply) => {
    setEditingId(qr.id);
    setForm({ shortcut: qr.shortcut, content: qr.content });
  };

  const handleSave = () => {
    if (!form || !form.shortcut?.trim() || !form.content?.trim()) return;

    const payload = {
      shortcut: form.shortcut.trim(),
      content: form.content.trim(),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, patch: payload });
    } else {
      addMutation.mutate(payload);
    }
    closeModal();
    setEditingId(null);
  };

  const handleDelete = (id: string, shortcut: string) => {
    if (window.confirm(`Hapus balasan cepat "/${shortcut}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdFlashOn color="var(--color-primary)" /> Balasan Cepat
        </h2>
      </div>

      <div className="cat-section">
        {isLoading ? (
          <div className="cat-empty">Memuat balasan cepat...</div>
        ) : isError ? (
          <div className="cat-empty">Gagal memuat data.</div>
        ) : quickReplies.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <MdFlashOn size={32} color="var(--color-primary)" />
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', marginBottom: 24 }}>Belum ada balasan cepat.</p>
            <button className="cat-add-btn" onClick={openAdd} style={{ padding: '0 24px', height: '40px' }}>
              <MdAdd size={20} /> Buat Balasan Pertama
            </button>
          </div>
        ) : (
          <>
            <div className="cat-section-head">
              <h3>Daftar Shortcut</h3>
              <button className="cat-add-btn" onClick={openAdd}>
                <MdAdd size={18} /> Tambah Balasan
              </button>
            </div>
            <div className="cat-list">
              {quickReplies.map((qr) => (
              <div key={qr.id} className="cat-know-row">
                <div className="cat-know-body">
                  <div className="cat-know-title" style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>/{qr.shortcut}</div>
                  <p className="cat-know-content" style={{ marginTop: 8 }}>{qr.content}</p>
                </div>
                <div className="cat-card-actions">
                  <button onClick={() => openEdit(qr)} title="Edit"><MdEdit size={16} /></button>
                  <button className="danger" onClick={() => handleDelete(qr.id, qr.shortcut)} title="Hapus"><MdDelete size={16} /></button>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      {form && (
        <div className={`cat-modal-overlay ${isClosing ? 'closing' : ''}`} onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}>
          <div className={`cat-modal ${isClosing ? 'closing' : ''}`}>
            <div className="cat-modal-head">
              <h3>{editingId ? 'Edit Balasan Cepat' : 'Tambah Balasan Cepat'}</h3>
              <button onClick={closeModal}><MdClose size={20} /></button>
            </div>
            <div className="cat-form">
              <label>
                Shortcut / Kata Kunci *
                <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 4 }}>
                  <span style={{ 
                    padding: '8px 12px', 
                    backgroundColor: 'var(--color-background)', 
                    border: '1px solid var(--color-border)', 
                    borderRight: 'none', 
                    borderRadius: '8px 0 0 8px', 
                    color: 'var(--color-text-secondary)', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center'
                  }}>/</span>
                  <input 
                    style={{ borderRadius: '0 8px 8px 0', marginTop: 0 }}
                    value={form.shortcut} 
                    onChange={e => setForm({ ...form, shortcut: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() })} 
                    placeholder="halo, ongkir, resi" 
                  />
                </div>
                <small style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginTop: 4, display: 'block' }}>Hanya huruf, angka, strip, dan underscore. Tanpa spasi.</small>
              </label>
              
              <label>
                Isi Balasan *
                <textarea 
                  rows={6} 
                  value={form.content} 
                  onChange={e => setForm({ ...form, content: e.target.value })} 
                  placeholder="Ketik isi balasan yang lengkap di sini..." 
                />
              </label>
            </div>
            <div className="cat-modal-foot">
              <button className="cat-btn-ghost" onClick={closeModal}>Batal</button>
              <button 
                className="cat-btn-primary" 
                onClick={handleSave} 
                disabled={!form.shortcut?.trim() || !form.content?.trim() || addMutation.isPending || updateMutation.isPending}
              >
                {addMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
