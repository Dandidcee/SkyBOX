import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdClose, MdChat } from 'react-icons/md';
import { useContacts, useContactMutations } from '../../hooks/useContacts';
import type { Account, Contact } from '../../types/db';
import api from '../../services/api';
import './Contacts.css';

interface ContactsProps {
  accounts: Account[];
  onOpenChat: (accountId: string, conversationId: string) => void;
}

const Contacts = ({ accounts, onOpenChat }: ContactsProps) => {
  const [activeAccountId, setActiveAccountId] = useState(accounts[0]?.id || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [startingChat, setStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  const { data: contacts = [], isLoading } = useContacts(activeAccountId);
  const { add, update, remove } = useContactMutations(activeAccountId);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', phone: '' });
    setIsFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setForm({ name: contact.name, phone: contact.phone });
    setIsFormOpen(true);
  };

  const closeForm = () => setIsFormOpen(false);

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Nama dan nomor HP wajib diisi.');
      return;
    }
    if (editingId === null) {
      add.mutate(form);
    } else {
      update.mutate({ id: editingId, patch: form });
    }
    closeForm();
  };

  const handleDelete = (contact: Contact) => {
    if (confirm(`Hapus kontak "${contact.name}"?`)) {
      remove.mutate(contact.id);
    }
  };

  const handleStartChat = async (contact: Contact) => {
    if (startingChat) return;
    setStartingChat(contact.id);
    try {
      const res = await api.post<{id: string}>('/conversations/start', {
        accountId: activeAccountId,
        phone: contact.phone,
        name: contact.name
      });
      onOpenChat(activeAccountId, res.data.id);
    } catch (err) {
      console.error(err);
      alert('Gagal memulai chat dengan kontak ini.');
    } finally {
      setStartingChat(null);
    }
  };

  if (!accounts.length) {
    return <div className="contacts-container"><p>Belum ada akun WhatsApp. Tambahkan di Integrations.</p></div>;
  }

  return (
    <div className="contacts-container">
      <div className="contacts-header">
        <div>
          <h2>Kontak</h2>
          <p className="contacts-subtitle">Kelola kontak dan mulai chat dengan pelanggan.</p>
        </div>
        <div className="contacts-actions">
          <select 
            className="account-selector"
            value={activeAccountId}
            onChange={(e) => setActiveAccountId(e.target.value)}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={openAdd}>
            <MdAdd size={20} /> Tambah Kontak
          </button>
        </div>
      </div>

      <div className="contacts-content">
        {isLoading ? (
          <p>Memuat kontak...</p>
        ) : contacts.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada kontak untuk akun ini.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Nomor HP</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td className="text-right actions-cell">
                      <button 
                        className="icon-btn-text text-primary"
                        onClick={() => handleStartChat(c)}
                        disabled={startingChat === c.id}
                        title="Mulai Chat"
                      >
                        <MdChat size={18} /> {startingChat === c.id ? 'Memulai...' : 'Mulai Chat'}
                      </button>
                      <button className="icon-btn" onClick={() => openEdit(c)} title="Edit">
                        <MdEdit size={18} />
                      </button>
                      <button className="icon-btn danger" onClick={() => handleDelete(c)} title="Hapus">
                        <MdDelete size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeForm();
        }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Kontak' : 'Tambah Kontak Baru'}</h3>
              <button className="icon-btn" onClick={closeForm}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span className="field-label">Nama Kontak</span>
                <input
                  className="field-input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Budi Susanto"
                />
              </label>
              <label className="field">
                <span className="field-label">Nomor WhatsApp (dengan kode negara, contoh 628xxx)</span>
                <input
                  className="field-input"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="6281234567890"
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

export default Contacts;
