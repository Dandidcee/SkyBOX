import { useState } from 'react';
import {
  MdInventory2, MdMenuBook, MdLocalOffer, MdAdd, MdEdit, MdDelete, MdClose, MdKeyboardArrowDown, MdChat,
} from 'react-icons/md';
import type { Account, Product, Knowledge, Promo } from '../../types/db';
import {
  useProducts, useProductMutations, useKnowledge, useKnowledgeMutations, usePromos, usePromoMutations,
} from '../../hooks/useCatalog';
import { toDirectImageUrl } from '../../lib/imageUrl';
import '../dashboard/Dashboard.css';
import './Catalog.css';

interface CatalogProps {
  accounts: Account[];
}

type Tab = 'products' | 'knowledge' | 'promos';

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

const emptyProduct = (accountId: string): Omit<Product, 'id'> => ({
  accountId, name: '', description: '', price: null, sku: '', stock: null, imageUrl: '', category: '', isActive: true, variants: '',
});
const emptyKnowledge = (accountId: string): Omit<Knowledge, 'id'> => ({
  accountId, title: '', content: '', tags: '',
});
const emptyPromo = (accountId: string): Omit<Promo, 'id'> => ({
  accountId, title: '', description: '', bannerUrl: '', productIds: [], isActive: true,
});

const Catalog = ({ accounts }: CatalogProps) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [accDropdownOpen, setAccDropdownOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('products');

  // Akun aktif: pilihan user, fallback ke akun pertama (derive saat render — tanpa setState di effect).
  const accountId = (selectedId && accounts.some(a => a.id === selectedId)) ? selectedId : (accounts[0]?.id ?? '');
  const account = accounts.find(a => a.id === accountId);

  const { data: products = [], isLoading: prodLoading } = useProducts(accountId || undefined);
  const { data: knowledge = [], isLoading: knowLoading } = useKnowledge(accountId || undefined);
  const { data: promos = [], isLoading: promoLoading } = usePromos(accountId || undefined);
  const prodMut = useProductMutations(accountId || undefined);
  const knowMut = useKnowledgeMutations(accountId || undefined);
  const promoMut = usePromoMutations(accountId || undefined);

  const [productForm, setProductForm] = useState<Omit<Product, 'id'> | null>(null);
  const [productEditId, setProductEditId] = useState<string | null>(null);
  const [variantEntries, setVariantEntries] = useState<VariantEntry[]>([]);
  const [knowForm, setKnowForm] = useState<Omit<Knowledge, 'id'> | null>(null);
  const [knowEditId, setKnowEditId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<Omit<Promo, 'id'> | null>(null);
  const [promoEditId, setPromoEditId] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header"><h2>Produk & Pengetahuan</h2></div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Belum ada akun WhatsApp. Tambahkan dulu di menu Integrations.</p>
      </div>
    );
  }

  // ----- Produk handlers -----
  const openAddProduct = () => { setProductEditId(null); setProductForm(emptyProduct(accountId)); setVariantEntries([]); };
  const openEditProduct = (p: Product) => {
    setProductEditId(p.id);
    setProductForm({ accountId: p.accountId, name: p.name, description: p.description, price: p.price, sku: p.sku, stock: p.stock, imageUrl: p.imageUrl, category: p.category, isActive: p.isActive, variants: p.variants });
    setVariantEntries(parseVariants(p.variants));
  };
  const saveProduct = () => {
    if (!productForm || !productForm.name.trim()) return;
    // Normalisasi semua URL gambar (multi-line): Drive → CDN langsung, per baris.
    const normalizedImages = productForm.imageUrl
      .split('\n')
      .map(u => toDirectImageUrl(u.trim()))
      .filter(Boolean)
      .join('\n');
    // Normalisasi URL gambar di varian juga
    const normalizedVariants = variantEntries.map(v => ({
      name: v.name,
      images: v.images.split('\n').map(u => toDirectImageUrl(u.trim())).filter(Boolean).join('\n'),
      guide: v.guide,
    }));
    const payload = { ...productForm, imageUrl: normalizedImages, variants: serializeVariants(normalizedVariants) };
    if (productEditId) prodMut.update.mutate({ id: productEditId, patch: payload });
    else prodMut.add.mutate(payload);
    setProductForm(null); setProductEditId(null); setVariantEntries([]);
  };

  // ----- Knowledge handlers -----
  const openAddKnow = () => { setKnowEditId(null); setKnowForm(emptyKnowledge(accountId)); };
  const openEditKnow = (k: Knowledge) => {
    setKnowEditId(k.id);
    setKnowForm({ accountId: k.accountId, title: k.title, content: k.content, tags: k.tags });
  };
  const saveKnow = () => {
    if (!knowForm || !knowForm.title.trim()) return;
    if (knowEditId) knowMut.update.mutate({ id: knowEditId, patch: knowForm });
    else knowMut.add.mutate(knowForm);
    setKnowForm(null); setKnowEditId(null);
  };

  // ----- Promo handlers -----
  const openAddPromo = () => { setPromoEditId(null); setPromoForm(emptyPromo(accountId)); };
  const openEditPromo = (pr: Promo) => {
    setPromoEditId(pr.id);
    setPromoForm({ accountId: pr.accountId, title: pr.title, description: pr.description, bannerUrl: pr.bannerUrl, productIds: pr.productIds, isActive: pr.isActive });
  };
  const togglePromoProduct = (productId: string) => {
    if (!promoForm) return;
    const has = promoForm.productIds.includes(productId);
    setPromoForm({
      ...promoForm,
      productIds: has ? promoForm.productIds.filter(id => id !== productId) : [...promoForm.productIds, productId],
    });
  };
  const savePromo = () => {
    if (!promoForm || !promoForm.title.trim()) return;
    const payload = { ...promoForm, bannerUrl: toDirectImageUrl(promoForm.bannerUrl) };
    if (promoEditId) promoMut.update.mutate({ id: promoEditId, patch: payload });
    else promoMut.add.mutate(payload);
    setPromoForm(null); setPromoEditId(null);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2>Produk & Pengetahuan</h2>

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
        Data ini dipakai AI (lewat N8N) untuk menjawab pelanggan di nomor <b>{account?.name}</b>. Tiap nomor WA punya katalog & pengetahuan sendiri.
      </p>

      {/* Tab */}
      <div className="cat-tabs">
        <button className={`cat-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          <MdInventory2 size={18} /> Produk ({products.length})
        </button>
        <button className={`cat-tab ${tab === 'knowledge' ? 'active' : ''}`} onClick={() => setTab('knowledge')}>
          <MdMenuBook size={18} /> Pengetahuan ({knowledge.length})
        </button>
        <button className={`cat-tab ${tab === 'promos' ? 'active' : ''}`} onClick={() => setTab('promos')}>
          <MdLocalOffer size={18} /> Promo ({promos.length})
        </button>
      </div>

      {tab === 'products' && (
        <div className="cat-section">
          <div className="cat-section-head">
            <h3>Katalog Produk</h3>
            <button className="cat-add-btn" onClick={openAddProduct}><MdAdd size={18} /> Tambah Produk</button>
          </div>
          {prodLoading ? (
            <div className="cat-empty">Memuat…</div>
          ) : products.length === 0 ? (
            <div className="cat-empty">Belum ada produk untuk akun ini.</div>
          ) : (
            <div className="cat-grid">
              {products.map(p => (
                <div key={p.id} className="cat-card">
                  {p.imageUrl && <img src={toDirectImageUrl(p.imageUrl.split('\n')[0])} alt={p.name} className="cat-card-img" referrerPolicy="no-referrer" />}
                  <div className="cat-card-body">
                    <div className="cat-card-title">
                      <span>{p.name}</span>
                      {!p.isActive && <span className="cat-badge off">nonaktif</span>}
                    </div>
                    {p.category && <span className="cat-card-cat">{p.category}</span>}
                    <div className="cat-card-meta">
                      {p.price != null && <span className="cat-price">Rp {p.price.toLocaleString('id-ID')}</span>}
                      {p.stock != null && <span className="cat-stock">stok: {p.stock}</span>}
                    </div>
                    {p.description && <p className="cat-card-desc">{p.description}</p>}
                  </div>
                  <div className="cat-card-actions">
                    <button onClick={() => openEditProduct(p)} title="Edit"><MdEdit size={16} /></button>
                    <button className="danger" onClick={() => { if (confirm(`Hapus produk "${p.name}"?`)) prodMut.remove.mutate(p.id); }} title="Hapus"><MdDelete size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'knowledge' && (
        <div className="cat-section">
          <div className="cat-section-head">
            <h3>Basis Pengetahuan</h3>
            <button className="cat-add-btn" onClick={openAddKnow}><MdAdd size={18} /> Tambah Pengetahuan</button>
          </div>
          {knowLoading ? (
            <div className="cat-empty">Memuat…</div>
          ) : knowledge.length === 0 ? (
            <div className="cat-empty">Belum ada pengetahuan untuk akun ini. Mis. ongkir, jam buka, cara order.</div>
          ) : (
            <div className="cat-list">
              {knowledge.map(k => (
                <div key={k.id} className="cat-know-row">
                  <div className="cat-know-body">
                    <div className="cat-know-title">{k.title}</div>
                    {k.tags && <div className="cat-know-tags">{k.tags}</div>}
                    <p className="cat-know-content">{k.content}</p>
                  </div>
                  <div className="cat-card-actions">
                    <button onClick={() => openEditKnow(k)} title="Edit"><MdEdit size={16} /></button>
                    <button className="danger" onClick={() => { if (confirm(`Hapus "${k.title}"?`)) knowMut.remove.mutate(k.id); }} title="Hapus"><MdDelete size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'promos' && (
        <div className="cat-section">
          <div className="cat-section-head">
            <h3>Promo</h3>
            <button className="cat-add-btn" onClick={openAddPromo}><MdAdd size={18} /> Tambah Promo</button>
          </div>
          {promoLoading ? (
            <div className="cat-empty">Memuat…</div>
          ) : promos.length === 0 ? (
            <div className="cat-empty">Belum ada promo untuk akun ini. Mis. diskon, bundling, gratis ongkir.</div>
          ) : (
            <div className="cat-grid">
              {promos.map(pr => {
                const targetNames = pr.productIds.length === 0
                  ? 'Semua produk'
                  : products.filter(p => pr.productIds.includes(p.id)).map(p => p.name).join(', ') || '—';
                return (
                  <div key={pr.id} className="cat-card">
                    {pr.bannerUrl && <img src={toDirectImageUrl(pr.bannerUrl)} alt={pr.title} className="cat-card-img" referrerPolicy="no-referrer" />}
                    <div className="cat-card-body">
                      <div className="cat-card-title">
                        <span>{pr.title}</span>
                        {!pr.isActive && <span className="cat-badge off">nonaktif</span>}
                      </div>
                      <span className="cat-card-cat">{targetNames}</span>
                      {pr.description && <p className="cat-card-desc">{pr.description}</p>}
                    </div>
                    <div className="cat-card-actions">
                      <button onClick={() => openEditPromo(pr)} title="Edit"><MdEdit size={16} /></button>
                      <button className="danger" onClick={() => { if (confirm(`Hapus promo "${pr.title}"?`)) promoMut.remove.mutate(pr.id); }} title="Hapus"><MdDelete size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Produk */}
      {productForm && (
        <div className="cat-modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setProductForm(null);
        }}>
          <div className="cat-modal">
            <div className="cat-modal-head">
              <h3>{productEditId ? 'Edit Produk' : 'Tambah Produk'}</h3>
              <button onClick={() => setProductForm(null)}><MdClose size={20} /></button>
            </div>
            <div className="cat-form">
              <label>Nama produk *<input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="mis. Kacamata Anti Radiasi" /></label>
              <div className="cat-form-row">
                <label>Harga (Rp)<input type="number" value={productForm.price ?? ''} onChange={e => setProductForm({ ...productForm, price: e.target.value === '' ? null : Number(e.target.value) })} placeholder="150000" /></label>
                <label>Stok<input type="number" value={productForm.stock ?? ''} onChange={e => setProductForm({ ...productForm, stock: e.target.value === '' ? null : Number(e.target.value) })} placeholder="10" /></label>
              </div>
              <div className="cat-form-row">
                <label>SKU<input value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} placeholder="KCM-001" /></label>
                <label>Kategori<input value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} placeholder="Kacamata" /></label>
              </div>
              <label>URL Gambar (1 URL per baris, boleh link Google Drive publik)<textarea rows={3} value={productForm.imageUrl} onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })} placeholder={"https://drive.google.com/file/d/.../view\nhttps://drive.google.com/file/d/.../view\nhttps://link-gambar-lain.jpg"} /></label>
              <label>Deskripsi<textarea rows={3} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} placeholder="Detail produk, bahan, warna, dll." /></label>
              <label>Varian Produk</label>
              <div className="cat-variants">
                {variantEntries.map((v, i) => (
                  <div key={i} className="cat-variant-row">
                    <div className="cat-variant-head">
                      <span className="cat-variant-title">Varian {i + 1}</span>
                      <button type="button" className="cat-btn-ghost" style={{ padding: '2px 8px', fontSize: 12, height: '28px', color: 'var(--color-error)' }} onClick={() => setVariantEntries(variantEntries.filter((_, j) => j !== i))}>✕ Hapus</button>
                    </div>
                    <div className="cat-variant-fields">
                      <div className="cat-variant-field">
                        <label>Nama Varian (Hitam, Gold, L, dll)</label>
                        <input value={v.name} onChange={e => { const arr = [...variantEntries]; arr[i] = { ...v, name: e.target.value }; setVariantEntries(arr); }} placeholder="Ketik nama varian di sini..." />
                      </div>
                      <div className="cat-variant-field">
                        <label>URL Foto Varian (1 Per Baris)</label>
                        <textarea rows={2} value={v.images} onChange={e => { const arr = [...variantEntries]; arr[i] = { ...v, images: e.target.value }; setVariantEntries(arr); }} placeholder="https://..." />
                      </div>
                      <div className="cat-variant-field">
                        <label>Panduan AI (Opsional)</label>
                        <input value={v.guide} onChange={e => { const arr = [...variantEntries]; arr[i] = { ...v, guide: e.target.value }; setVariantEntries(arr); }} placeholder="Misal: Cocok untuk usia 25-35 thn" />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="cat-btn-ghost" onClick={() => setVariantEntries([...variantEntries, { name: '', images: '', guide: '' }])}>+ Tambah Varian</button>
              </div>
              <label className="cat-check"><input type="checkbox" checked={productForm.isActive} onChange={e => setProductForm({ ...productForm, isActive: e.target.checked })} /> Produk aktif (dipakai AI)</label>
            </div>
            <div className="cat-modal-foot">
              <button className="cat-btn-ghost" onClick={() => setProductForm(null)}>Batal</button>
              <button className="cat-btn-primary" onClick={saveProduct} disabled={!productForm.name.trim()}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Knowledge */}
      {knowForm && (
        <div className="cat-modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setKnowForm(null);
        }}>
          <div className="cat-modal">
            <div className="cat-modal-head">
              <h3>{knowEditId ? 'Edit Pengetahuan' : 'Tambah Pengetahuan'}</h3>
              <button onClick={() => setKnowForm(null)}><MdClose size={20} /></button>
            </div>
            <div className="cat-form">
              <label>Judul *<input value={knowForm.title} onChange={e => setKnowForm({ ...knowForm, title: e.target.value })} placeholder="mis. Ongkir & Pengiriman" /></label>
              <label>Tags<input value={knowForm.tags} onChange={e => setKnowForm({ ...knowForm, tags: e.target.value })} placeholder="ongkir, kirim, ekspedisi" /></label>
              <label>Isi *<textarea rows={6} value={knowForm.content} onChange={e => setKnowForm({ ...knowForm, content: e.target.value })} placeholder="Tulis info lengkap di sini..." /></label>
            </div>
            <div className="cat-modal-foot">
              <button className="cat-btn-ghost" onClick={() => setKnowForm(null)}>Batal</button>
              <button className="cat-btn-primary" onClick={saveKnow} disabled={!knowForm.title.trim()}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Promo */}
      {promoForm && (
        <div className="cat-modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPromoForm(null);
        }}>
          <div className="cat-modal">
            <div className="cat-modal-head">
              <h3>{promoEditId ? 'Edit Promo' : 'Tambah Promo'}</h3>
              <button onClick={() => setPromoForm(null)}><MdClose size={20} /></button>
            </div>
            <div className="cat-form">
              <label>Judul Promo *<input value={promoForm.title} onChange={e => setPromoForm({ ...promoForm, title: e.target.value })} placeholder="mis. DISKON 20% Akhir Bulan" /></label>
              <label>Deskripsi<textarea rows={3} value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} placeholder="Detail promo: syarat, periode, potongan, dll. (dibaca AI)" /></label>
              <label>URL Banner Promo (boleh link Google Drive)<input value={promoForm.bannerUrl} onChange={e => setPromoForm({ ...promoForm, bannerUrl: e.target.value })} placeholder="https://drive.google.com/file/d/.../view" /></label>
              <div className="cat-promo-products">
                <span className="cat-promo-label">Berlaku untuk produk:</span>
                <p className="cat-promo-hint">Kosongkan semua = berlaku untuk semua produk.</p>
                {products.length === 0 ? (
                  <p className="cat-promo-hint">Belum ada produk. Promo akan berlaku untuk semua produk.</p>
                ) : (
                  <div className="cat-promo-checklist">
                    {products.map(p => (
                      <label key={p.id} className="cat-promo-check">
                        <input
                          type="checkbox"
                          checked={promoForm.productIds.includes(p.id)}
                          onChange={() => togglePromoProduct(p.id)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <label className="cat-check"><input type="checkbox" checked={promoForm.isActive} onChange={e => setPromoForm({ ...promoForm, isActive: e.target.checked })} /> Promo aktif (dipakai AI)</label>
            </div>
            <div className="cat-modal-foot">
              <button className="cat-btn-ghost" onClick={() => setPromoForm(null)}>Batal</button>
              <button className="cat-btn-primary" onClick={savePromo} disabled={!promoForm.title.trim()}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
