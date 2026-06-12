import { useState } from 'react';
import {
  MdInventory2, MdMenuBook, MdAdd, MdEdit, MdDelete, MdClose, MdKeyboardArrowDown, MdChat,
} from 'react-icons/md';
import type { Account, Product, Knowledge } from '../../types/db';
import {
  useProducts, useProductMutations, useKnowledge, useKnowledgeMutations,
} from '../../hooks/useCatalog';
import { toDirectImageUrl } from '../../lib/imageUrl';
import '../dashboard/Dashboard.css';
import './Catalog.css';

interface CatalogProps {
  accounts: Account[];
}

type Tab = 'products' | 'knowledge';

const emptyProduct = (accountId: string): Omit<Product, 'id'> => ({
  accountId, name: '', description: '', price: null, sku: '', stock: null, imageUrl: '', category: '', isActive: true,
});
const emptyKnowledge = (accountId: string): Omit<Knowledge, 'id'> => ({
  accountId, title: '', content: '', tags: '',
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
  const prodMut = useProductMutations(accountId || undefined);
  const knowMut = useKnowledgeMutations(accountId || undefined);

  const [productForm, setProductForm] = useState<Omit<Product, 'id'> | null>(null);
  const [productEditId, setProductEditId] = useState<string | null>(null);
  const [knowForm, setKnowForm] = useState<Omit<Knowledge, 'id'> | null>(null);
  const [knowEditId, setKnowEditId] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header"><h2>Produk & Pengetahuan</h2></div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Belum ada akun WhatsApp. Tambahkan dulu di menu Integrations.</p>
      </div>
    );
  }

  // ----- Produk handlers -----
  const openAddProduct = () => { setProductEditId(null); setProductForm(emptyProduct(accountId)); };
  const openEditProduct = (p: Product) => {
    setProductEditId(p.id);
    setProductForm({ accountId: p.accountId, name: p.name, description: p.description, price: p.price, sku: p.sku, stock: p.stock, imageUrl: p.imageUrl, category: p.category, isActive: p.isActive });
  };
  const saveProduct = () => {
    if (!productForm || !productForm.name.trim()) return;
    // Normalisasi URL gambar (Drive → CDN langsung) agar bisa dipakai WAHA & preview.
    const payload = { ...productForm, imageUrl: toDirectImageUrl(productForm.imageUrl) };
    if (productEditId) prodMut.update.mutate({ id: productEditId, patch: payload });
    else prodMut.add.mutate(payload);
    setProductForm(null); setProductEditId(null);
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
      </div>

      {tab === 'products' ? (
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
                  {p.imageUrl && <img src={toDirectImageUrl(p.imageUrl)} alt={p.name} className="cat-card-img" />}
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
      ) : (
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

      {/* Modal Produk */}
      {productForm && (
        <div className="cat-modal-overlay" onClick={() => setProductForm(null)}>
          <div className="cat-modal" onClick={e => e.stopPropagation()}>
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
              <label>URL Gambar (boleh link Google Drive publik)<input value={productForm.imageUrl} onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })} placeholder="https://drive.google.com/file/d/.../view" /></label>
              <label>Deskripsi<textarea rows={3} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} placeholder="Detail produk, bahan, warna, dll." /></label>
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
        <div className="cat-modal-overlay" onClick={() => setKnowForm(null)}>
          <div className="cat-modal" onClick={e => e.stopPropagation()}>
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
    </div>
  );
};

export default Catalog;
