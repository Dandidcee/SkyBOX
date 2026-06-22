import { useState, useEffect } from 'react';
import { MdChat, MdKeyboardArrowDown, MdAutoAwesome } from 'react-icons/md';
import { useTemplates, useTemplateMutations } from '../../hooks/useTemplates';
import { toDirectImageUrl } from '../../lib/imageUrl';
import type { Account } from '../../types/db';
import '../dashboard/Dashboard.css';
import '../catalog/Catalog.css';

interface TemplatesProps {
  accounts: Account[];
}

/** Satu varian produk: nama + array URL gambar + panduan */
interface VariantEntry { name: string; images: string; guide: string; }

/** Parse JSON variants → array. Fallback: teks lama jadi 1 varian tanpa nama. */
function parseVariants(raw: string): VariantEntry[] {
  if (!raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map((v: { name?: string; images?: string[]; guide?: string }) => ({ name: v.name || '', images: (v.images || []).join('\n'), guide: v.guide || '' }));
  } catch { /* bukan JSON, fallback */ }
  return [{ name: '', images: raw, guide: '' }];
}

/** Serialize varian array → JSON string buat simpan ke DB */
function serializeVariants(entries: VariantEntry[]): string {
  const cleaned = entries.filter(e => e.name.trim() || e.images.trim());
  if (cleaned.length === 0) return '';
  return JSON.stringify(cleaned.map(e => ({
    name: e.name.trim(),
    images: e.images.split('\n').map(u => u.trim()).filter(Boolean),
    guide: e.guide.trim(),
  })));
}

export default function Templates({ accounts }: TemplatesProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [accDropdownOpen, setAccDropdownOpen] = useState(false);

  // Akun aktif: pilihan user, fallback ke akun pertama.
  const accountId = (selectedId && accounts.some(a => a.id === selectedId)) ? selectedId : (accounts[0]?.id ?? '');
  const account = accounts.find(a => a.id === accountId);

  const { data: templates = [], isLoading, isError } = useTemplates(accountId || undefined);
  const { save } = useTemplateMutations(accountId || undefined);

  // Jika ada data template, ambil yang pertama
  const existingTemplate = templates[0];

  // Local state for the form
  const [triggerText, setTriggerText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [variantEntries, setVariantEntries] = useState<VariantEntry[]>([]);

  // Sync state when account changes or data finishes loading
  useEffect(() => {
    if (existingTemplate) {
      setTriggerText(existingTemplate.triggerText === 'global' ? '' : existingTemplate.triggerText);
      setReplyText(existingTemplate.replyText);
      setVariantEntries(parseVariants(existingTemplate.variants || ''));
    } else {
      setTriggerText('');
      setReplyText('');
      setVariantEntries([]);
    }
  }, [existingTemplate, accountId]);

  if (accounts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header"><h2>Prompt AI & Varian Produk</h2></div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Belum ada akun WhatsApp. Tambahkan dulu di menu Integrations.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!replyText.trim()) return;

    // Normalisasi URL gambar di varian
    const normalizedVariants = variantEntries.map(v => ({
      name: v.name,
      images: v.images.split('\n').map(u => toDirectImageUrl(u.trim())).filter(Boolean).join('\n'),
      guide: v.guide,
    }));

    save.mutate({
      id: existingTemplate?.id,
      data: {
        accountId,
        triggerText: triggerText.trim(),
        replyText: replyText.trim(),
        imageUrl: '', // Gambar Utama dihapus, set kosong
        variants: serializeVariants(normalizedVariants),
      }
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdAutoAwesome color="var(--color-primary)" /> Prompt AI & Varian Produk
        </h2>

        {/* Pemilih akun WA */}
        <div className="cat-account-picker">
          <button className="cat-account-btn" onClick={() => setAccDropdownOpen(o => !o)}>
            <span className="cat-account-dot" style={{ backgroundColor: account?.color || 'var(--color-primary)' }}>
              <MdChat size={14} color="#fff" />
            </span>
            <span>{account?.name || 'Pilih akun'}</span>
            <MdKeyboardArrowDown size={18} />
          </button>
          {accDropdownOpen && (
            <div className="cat-account-dropdown">
              {accounts.map(a => (
                <div
                  key={a.id}
                  className={`cat-account-item ${a.id === accountId ? 'active' : ''}`}
                  onClick={() => { setSelectedId(a.id); setAccDropdownOpen(false); }}
                >
                  <span className="cat-account-dot" style={{ backgroundColor: a.color }}><MdChat size={12} color="#fff" /></span>
                  <span>{a.name}</span>
                  <span className="cat-account-phone">{a.phone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 16 }}>
        Atur <b>1 Prompt Global</b> dan kumpulan varian produk untuk akun WhatsApp ini. AI akan selalu membalas menggunakan konteks ini untuk setiap pelanggan yang baru pertama kali chat.
      </p>

      {isLoading ? (
        <div className="cat-empty">Memuat data...</div>
      ) : isError ? (
        <div className="cat-empty">Gagal memuat data.</div>
      ) : (
        <div className="cat-section">
          <div className="cat-form" style={{ padding: 0, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <label style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                Pesan Template (Teks Bawaan dari Iklan) *
                <input 
                  value={triggerText} 
                  onChange={e => setTriggerText(e.target.value)} 
                  placeholder="Contoh: Halo! Bisakah saya mendapatkan info selengkapnya?" 
                  style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}
                />
                <small style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
                  Teks yang dikirimkan calon pembeli pertama kali saat klik iklan. Ini akan dicocokkan di n8n.
                </small>
              </label>

              <label style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                Prompt AI (Konteks Bisnis / Iklan) *
                <textarea 
                  rows={6} 
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)} 
                  placeholder="Tuliskan instruksi untuk AI di sini. Contoh: Kamu adalah CS toko kacamata. Jelaskan promo Buy 1 Get 1..." 
                  style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, resize: 'vertical', minHeight: '120px' }}
                />
              </label>

              <label style={{ marginBottom: 8, display: 'block', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Varian & Foto</label>
              <div className="cat-variants">
                {variantEntries.map((v, i) => (
                  <div key={i} className="cat-variant-row">
                    <div className="cat-variant-head">
                      <span className="cat-variant-title">Varian / Produk {i + 1}</span>
                      <button type="button" className="cat-btn-ghost" style={{ padding: '2px 8px', fontSize: 12, height: '28px', color: 'var(--color-error)' }} onClick={() => setVariantEntries(variantEntries.filter((_, j) => j !== i))}>✕ Hapus</button>
                    </div>
                    <div className="cat-variant-fields">
                      <div className="cat-variant-field">
                        <label>Nama Varian / Warna</label>
                        <input value={v.name} onChange={e => { const arr = [...variantEntries]; arr[i] = { ...v, name: e.target.value }; setVariantEntries(arr); }} placeholder="Ketik nama produk di sini..." />
                      </div>
                      <div className="cat-variant-field">
                        <label>Link Gambar (Opsional)</label>
                        <textarea rows={2} value={v.images} onChange={e => { const arr = [...variantEntries]; arr[i] = { ...v, images: e.target.value }; setVariantEntries(arr); }} placeholder="https://..." />
                      </div>
                      <div className="cat-variant-field">
                        <label>Instruksi Spesifik AI (Opsional)</label>
                        <input value={v.guide} onChange={e => { const arr = [...variantEntries]; arr[i] = { ...v, guide: e.target.value }; setVariantEntries(arr); }} placeholder="Misal: Jelaskan ini best seller" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="cat-btn-ghost" onClick={() => setVariantEntries([...variantEntries, { name: '', images: '', guide: '' }])}>+ Tambah Varian / Produk</button>
              </div>
            </div>

            <div className="cat-modal-foot" style={{ backgroundColor: 'var(--color-background)' }}>
              <button 
                className="cat-btn-primary" 
                onClick={handleSave} 
                disabled={!replyText.trim() || save.isPending}
              >
                {save.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
