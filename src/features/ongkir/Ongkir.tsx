import { useState, useEffect } from 'react';
import { MdLocalShipping, MdSearch, MdClose } from 'react-icons/md';
import { FaWeightHanging } from 'react-icons/fa6';
import {
  searchDestination, checkCost, isOngkirConfigured,
  type OngkirDestination, type OngkirRate,
} from '../../services/ongkir';

import './Ongkir.css';

const COURIERS = ['jne', 'sicepat', 'jnt', 'anteraja', 'pos', 'tiki', 'wahana', 'ninja'];

const DestPicker = ({
  label, value, onPick,
}: {
  label: string;
  value: OngkirDestination | null;
  onPick: (d: OngkirDestination) => void;
}) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OngkirDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = q.trim();
      if (!query || query.length < 3) {
        setResults([]);
        return;
      }
      setLoading(true); setErr(null);
      try {
        setResults(await searchDestination(query));
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Gagal mencari');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="ongkir-field">
      <span className="ongkir-label">{label}</span>
      {value ? (
        <div className="ongkir-picked">
          <span>{value.label}</span>
          <button onClick={() => onPick({ id: '', label: '' })} title="Hapus pencarian ini">
            <MdClose size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="ongkir-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={label.toLowerCase().includes('asal') ? 'Cari alamat asal...' : 'Cari alamat tujuan...'}
            />
            <button disabled><MdSearch size={18} /></button>
          </div>
          {loading && <div className="ongkir-err" style={{color: '#999', fontSize: '12px', fontStyle: 'italic'}}>Mencari...</div>}
          {err && <div className="ongkir-err">{err}</div>}
          {results.length > 0 && (
            <div className="ongkir-results">
              {results.map((r) => (
                <div key={r.id} className="ongkir-result-item" onClick={() => { onPick(r); setResults([]); setQ(''); }}>
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const OngkirCalculator = ({ 
  onSelectRate 
}: { 
  onSelectRate?: (rate: OngkirRate, origin: OngkirDestination, dest: OngkirDestination, weight: number) => void 
}) => {
  const [origin, setOrigin] = useState<OngkirDestination | null>(null);
  const [dest, setDest] = useState<OngkirDestination | null>(null);
  const [weight, setWeight] = useState(1000);
  const [couriers, setCouriers] = useState<string[]>(['jne', 'sicepat', 'jnt']);
  const [rates, setRates] = useState<OngkirRate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleCourier = (c: string) =>
    setCouriers((prev) => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleCheck = async () => {
    setErr(null); setRates(null);
    if (!origin?.id || !dest?.id) { setErr('Pilih asal & tujuan dulu.'); return; }
    if (!weight || weight <= 0) { setErr('Berat harus lebih dari 0 gram.'); return; }
    if (couriers.length === 0) { setErr('Pilih minimal 1 kurir.'); return; }
    setLoading(true);
    try {
      const r = await checkCost({
        origin: origin.id, destination: dest.id, weight, courier: couriers.join(':'),
      });
      setRates(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal cek ongkir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DestPicker label="Kota Asal" value={origin} onPick={(d) => setOrigin(d.id ? d : null)} />
      <DestPicker label="Kota Tujuan" value={dest} onPick={(d) => setDest(d.id ? d : null)} />

      <div className="ongkir-field">
        <span className="ongkir-label">Berat (gram)</span>
        <div className="ongkir-weight">
          <FaWeightHanging size={14} color="var(--color-text-secondary)" />
          <input type="number" min={1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </div>
      </div>

      <div className="ongkir-field">
        <span className="ongkir-label" style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', display: 'block' }}>Kurir</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {COURIERS.map((c) => {
            const isSelected = couriers.includes(c);
            return (
              <label 
                key={c} 
                className={`ongkir-courier-btn ${isSelected ? 'selected' : ''}`}
              >
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => toggleCourier(c)} 
                  style={{ display: 'none' }} 
                />
                {isSelected && <span style={{ fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                {c.toUpperCase()}
              </label>
            );
          })}
        </div>
      </div>

      <button className="ongkir-btn" onClick={handleCheck} disabled={loading}>
        {loading ? 'Menghitung...' : 'Cek Ongkir'}
      </button>

      {err && <div className="ongkir-err">{err}</div>}

      {rates && (
        <div className="ongkir-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Hasil ({rates.length} opsi)</h3>
          {rates.length === 0 ? (
            <div className="ongkir-empty">Tidak ada layanan untuk rute ini.</div>
          ) : (
            <div className="ongkir-results-list">
              {rates.map((r, i) => (
                <div 
                  key={i} 
                  className="ongkir-rate-card"
                  onClick={() => {
                    if (onSelectRate && origin && dest) {
                      onSelectRate(r, origin, dest, weight);
                    }
                  }}
                  style={{ cursor: onSelectRate ? 'pointer' : 'default' }}
                >
                  <div className="ongkir-rate-left">
                    <div className="ongkir-rate-title">
                      <span className="ongkir-rate-courier">{r.courier}</span>
                      <span>{r.service}</span>
                    </div>
                    <div className="ongkir-rate-desc">{r.description}</div>
                  </div>
                  <div className="ongkir-rate-right">
                    <div className="ongkir-rate-cost">Rp {r.cost.toLocaleString('id-ID')}</div>
                    <div className="ongkir-rate-etd">{r.etd.replace(/hari|day/gi, '').trim()} Hari</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Ongkir = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2><MdLocalShipping size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Cek Ongkir</h2>
      </div>

      {!isOngkirConfigured && (
        <div className="ongkir-warn">
          API key belum diatur. Set <code>VITE_RAJAONGKIR_KEY</code> di file <code>.env</code> lalu restart dev server.
        </div>
      )}

      <div className="ongkir-card">
        <OngkirCalculator />
      </div>
    </div>
  );
};

export default Ongkir;
