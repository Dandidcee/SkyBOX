import { useState } from 'react';
import { MdChat, MdKeyboardArrowDown, MdAutoAwesome, MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { useTemplates, useTemplateMutations } from '../../hooks/useTemplates';
import { toDirectImageUrl } from '../../lib/imageUrl';
import type { Account, Template } from '../../types/db';
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

// ---------------- Template Form Component ----------------
interface TemplateFormProps {
  initialData: Template | null;
  accountId: string;
  onCancel: () => void;
  onSaved: () => void;
}

function TemplateForm({ initialData, accountId, onCancel, onSaved }: TemplateFormProps) {
  const { save } = useTemplateMutations(accountId);
  
  // Initialize state directly from initialData (no useEffect sync needed since key changes on parent)
  const initialParsed = parseCaptions(initialData?.variants || '');
  
  const [triggerText, setTriggerText] = useState(() => 
    initialData ? (initialData.triggerText === 'global' ? '' : (initialData.triggerText || '')) : ''
  );
  const [replyText, setReplyText] = useState(initialData?.replyText || '');
  const [captionEntries, setCaptionEntries] = useState<CaptionEntry[]>(initialParsed.captions);
  const [finalMessage, setFinalMessage] = useState(initialParsed.finalMessage || '');

  const handleSave = () => {
    if (!(replyText || '').trim()) return;

    const normalizedCaptions = captionEntries.map(e => ({
      caption: e.caption || '',
      image: toDirectImageUrl((e.image || '').trim()),
    }));

    save.mutate({
      id: initialData?.id,
      data: {
        accountId,
        triggerText: (triggerText || '').trim() || 'global', // Set fallback to global if empty
        replyText: (replyText || '').trim(),
        imageUrl: '',
        variants: serializeCaptions(normalizedCaptions, finalMessage || ''),
      }
    }, {
      onSuccess: () => onSaved()
    });
  };

  return (
    <div className="cat-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{initialData ? 'Edit Template Ads' : 'Tambah Template Ads Baru'}</h3>
        <button className="cat-btn-ghost" onClick={onCancel}>Batal</button>
      </div>

      <div className="cat-form" style={{ padding: 0, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <label style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            Kata Kunci / Pesan Template (Trigger Text)
            <input 
              value={triggerText} 
              onChange={e => setTriggerText(e.target.value)} 
              placeholder="Contoh: Halo! Bisakah saya mendapatkan info selengkapnya?" 
              style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}
            />
            <small style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
              Kosongkan untuk menjadikannya template Global (default) untuk semua chat masuk pertama kali yang tidak memiliki kata kunci spesifik.
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
                    <input value={v.image} onChange={e => { const arr = [...captionEntries]; arr[i] = { ...v, image: e.target.value }; setCaptionEntries(arr); }} placeholder="Masukkan link gambar (https://...)" style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  </div>
                  <div className="cat-variant-field">
                    <label>Isi Caption *</label>
                    <textarea rows={4} value={v.caption} onChange={e => { const arr = [...captionEntries]; arr[i] = { ...v, caption: e.target.value }; setCaptionEntries(arr); }} placeholder="Ketik isi caption di sini..." style={{ width: '100%', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, resize: 'vertical' }} />
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
              value={finalMessage} 
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
              !replyText.trim() || 
              save.isPending || 
              captionEntries.some(e => !e.image.trim() || !e.caption.trim())
            }
          >
            {save.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Main Templates Component ----------------
export default function Templates({ accounts }: TemplatesProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [accDropdownOpen, setAccDropdownOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | 'new' | null>(null);

  // Akun aktif: pilihan user, fallback ke akun pertama.
  const accountId = (selectedId && accounts.some(a => a.id === selectedId)) ? selectedId : (accounts[0]?.id ?? '');
  const account = accounts.find(a => a.id === accountId);

  const { data: templates = [], isLoading, isError } = useTemplates(accountId || undefined);
  const { remove } = useTemplateMutations(accountId || undefined);

  if (accounts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header"><h2>Prompt AI & Template Ads</h2></div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Belum ada akun WhatsApp. Tambahkan dulu di menu Integrations.</p>
      </div>
    );
  }

  const handleDelete = (id: string, triggerText: string) => {
    if (window.confirm(`Yakin ingin menghapus template "${triggerText === 'global' ? 'Global' : triggerText}"?`)) {
      remove.mutate(id);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdAutoAwesome color="var(--color-primary)" /> Prompt AI & Template Ads
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
                  onClick={() => { 
                    setSelectedId(a.id); 
                    setAccDropdownOpen(false); 
                    setEditingTemplate(null); // Tutup form saat ganti akun
                  }}
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
        Kelola instruksi AI (Prompt) dan caption otomatis untuk berbagai iklan yang berbeda berdasarkan kata kuncinya (Trigger Text).
      </p>

      {editingTemplate ? (
        <TemplateForm 
          key={editingTemplate === 'new' ? 'new' : editingTemplate.id}
          initialData={editingTemplate === 'new' ? null : editingTemplate}
          accountId={accountId}
          onCancel={() => setEditingTemplate(null)}
          onSaved={() => setEditingTemplate(null)}
        />
      ) : (
        <div className="cat-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Daftar Template</h3>
            <button className="cat-btn-primary" onClick={() => setEditingTemplate('new')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MdAdd size={18} /> Tambah Template
            </button>
          </div>
          
          {isLoading ? (
            <div className="cat-empty">Memuat data...</div>
          ) : isError ? (
            <div className="cat-empty">Gagal memuat data.</div>
          ) : templates.length === 0 ? (
            <div className="cat-empty">
              Belum ada template. Silakan tambah baru.
            </div>
          ) : (
            <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {templates.map(tpl => (
                <div key={tpl.id} className="cat-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Kata Kunci (Trigger):</div>
                    <div style={{ fontWeight: 600, color: tpl.triggerText === 'global' ? 'var(--color-primary)' : 'inherit' }}>
                      {tpl.triggerText === 'global' ? '🌐 Global (Default)' : `"${tpl.triggerText}"`}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Prompt AI:</div>
                    <div style={{ fontSize: 13, opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {tpl.replyText}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button className="cat-btn-ghost" onClick={() => setEditingTemplate(tpl)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}>
                      <MdEdit size={16} /> Edit
                    </button>
                    <button className="cat-btn-ghost" onClick={() => handleDelete(tpl.id, tpl.triggerText)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', color: 'var(--color-error)' }}>
                      <MdDelete size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
