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

/** Satu entri caption */
interface CaptionEntry { caption: string; image: string; }

/** Parse JSON variants → array dan final message. */
function parseCaptions(raw: string): { captions: CaptionEntry[], finalMessage: string } {
  if (!raw.trim()) return { captions: [], finalMessage: '' };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Format lama: array langsung
      return {
        captions: parsed.map((v: any) => {
          let imgStr = '';
          if (typeof v.image === 'string') imgStr = v.image;
          else if (Array.isArray(v.images) && v.images.length > 0) imgStr = v.images[0];
          else if (typeof v.images === 'string') imgStr = v.images;
          
          return {
            caption: v.caption || v.guide || v.name || '',
            image: imgStr
          };
        }),
        finalMessage: ''
      };
    } else if (parsed && typeof parsed === 'object') {
      // Format baru: { captions: [], finalMessage: '' }
      return {
        captions: (parsed.captions || []).map((v: any) => {
          let imgStr = '';
          if (typeof v.image === 'string') imgStr = v.image;
          else if (Array.isArray(v.images) && v.images.length > 0) imgStr = v.images[0];
          else if (typeof v.images === 'string') imgStr = v.images;
          
          return {
            caption: v.caption || '',
            image: imgStr
          };
        }),
        finalMessage: parsed.finalMessage || ''
      };
    }
  } catch { /* bukan JSON, fallback */ }
  return { captions: [{ caption: raw, image: '' }], finalMessage: '' };
}

/** Serialize ke JSON string buat simpan ke DB */
function serializeCaptions(entries: CaptionEntry[], finalMessage: string): string {
  const cleaned = entries.filter(e => e.caption.trim() || e.image.trim());
  return JSON.stringify({
    captions: cleaned.map(e => ({
      caption: e.caption.trim(),
      image: e.image.trim(),
    })),
    finalMessage: finalMessage.trim()
  });
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
  const [captionEntries, setCaptionEntries] = useState<CaptionEntry[]>([]);
  const [finalMessage, setFinalMessage] = useState('');

  // Sync state when account changes or data finishes loading
  useEffect(() => {
    if (existingTemplate) {
      setTriggerText(existingTemplate.triggerText === 'global' ? '' : (existingTemplate.triggerText || ''));
      setReplyText(existingTemplate.replyText || '');
      const parsed = parseCaptions(existingTemplate.variants || '');
      setCaptionEntries(parsed.captions);
      setFinalMessage(parsed.finalMessage || '');
    } else {
      setTriggerText('');
      setReplyText('');
      setCaptionEntries([]);
      setFinalMessage('');
    }
  }, [existingTemplate, accountId]);

  if (accounts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header"><h2>Prompt AI & Template Caption</h2></div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Belum ada akun WhatsApp. Tambahkan dulu di menu Integrations.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!(replyText || '').trim()) return;

    const normalizedCaptions = captionEntries.map(e => ({
      caption: e.caption || '',
      image: toDirectImageUrl((e.image || '').trim()),
    }));

    save.mutate({
      id: existingTemplate?.id,
      data: {
        accountId,
        triggerText: (triggerText || '').trim(),
        replyText: (replyText || '').trim(),
        imageUrl: '', // Gambar Utama dihapus, set kosong
        variants: serializeCaptions(normalizedCaptions, finalMessage || ''),
      }
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdAutoAwesome color="var(--color-primary)" /> Prompt AI & Template Caption
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
        Atur <b>1 Prompt Global</b> dan kumpulan caption untuk akun WhatsApp ini. AI akan selalu membalas menggunakan konteks ini untuk setiap pelanggan yang baru pertama kali chat.
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
                  value={triggerText || ''} 
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
                  value={replyText || ''} 
                  onChange={e => setReplyText(e.target.value)} 
                  placeholder="Tuliskan instruksi untuk AI di sini. Contoh: Kamu adalah CS toko kacamata. Jelaskan promo Buy 1 Get 1..." 
                  style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, resize: 'vertical', minHeight: '120px' }}
                />
              </label>

              <label style={{ marginBottom: 8, display: 'block', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Template Caption</label>
              <div className="cat-variants">
                {captionEntries.map((v, i) => (
                  <div key={i} className="cat-variant-row">
                    <div className="cat-variant-head">
                      <span className="cat-variant-title">Caption {i + 1}</span>
                      <button type="button" className="cat-btn-ghost" style={{ padding: '2px 8px', fontSize: 12, height: '28px', color: 'var(--color-error)' }} onClick={() => setCaptionEntries(captionEntries.filter((_, j) => j !== i))}>✕ Hapus</button>
                    </div>
                    <div className="cat-variant-fields" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="cat-variant-field">
                        <label>Link Gambar *</label>
                        <input value={v.image || ''} onChange={e => { const arr = [...captionEntries]; arr[i] = { ...v, image: e.target.value }; setCaptionEntries(arr); }} placeholder="Masukkan link gambar (https://...)" style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }} />
                      </div>
                      <div className="cat-variant-field">
                        <label>Isi Caption *</label>
                        <textarea rows={4} value={v.caption || ''} onChange={e => { const arr = [...captionEntries]; arr[i] = { ...v, caption: e.target.value }; setCaptionEntries(arr); }} placeholder="Ketik isi caption di sini..." style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, resize: 'vertical' }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="cat-btn-ghost" onClick={() => setCaptionEntries([...captionEntries, { caption: '', image: '' }])}>+ Tambah Caption</button>
              </div>

              <label style={{ marginTop: 24, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                Pesan Terakhir (Opsional)
                <textarea 
                  rows={3} 
                  value={finalMessage || ''} 
                  onChange={e => setFinalMessage(e.target.value)} 
                  placeholder="Ketik pesan terakhir atau penutup di sini..." 
                  style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, resize: 'vertical', fontWeight: 'normal' }}
                />
              </label>
            </div>

            <div className="cat-modal-foot" style={{ backgroundColor: 'var(--color-background)' }}>
              <button 
                className="cat-btn-primary" 
                onClick={handleSave} 
                disabled={
                  !(replyText || '').trim() || 
                  save.isPending || 
                  captionEntries.some(e => !(e.image || '').trim() || !(e.caption || '').trim())
                }
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
