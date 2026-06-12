import { useState } from 'react';
import { MdLocalShipping, MdSearch, MdInventory2 } from 'react-icons/md';
import {
  searchDestination, checkCost, isOngkirConfigured,
  type OngkirDestination, type OngkirRate,
} from '../../services/ongkir';
import '../dashboard/Dashboard.css';
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

  const doSearch = async () => {
    if (!q.trim()) return;
    setLoading(true); setErr(null);
    try {
      setResults(await searchDestination(q.trim()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal mencari');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ongkir-field">
      <span className="ongkir-label">{label}</span>
      {value ? (
        <div className="ongkir-picked">
          <span>{value.label}</span>
          <button onClick={() => onPick({ id: '', label: '' })}>ganti</button>
        </div>
      ) : (
        <>
          <div className="ongkir-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="ketik kota/kecamatan…"
            />
            <button onClick={doSearch} disabled={loading}><MdSearch size={18} /></button>
          </div>
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

const Ongkir = () => {
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
        <DestPicker label="Kota Asal" value={origin} onPick={(d) => setOrigin(d.id ? d : null)} />
        <DestPicker label="Kota Tujuan" value={dest} onPick={(d) => setDest(d.id ? d : null)} />

        <div className="ongkir-field">
          <span className="ongkir-label">Berat (gram)</span>
          <div className="ongkir-weight">
            <MdInventory2 size={16} />
            <input type="number" min={1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </div>
        </div>

        <div className="ongkir-field">
          <span className="ongkir-label">Kurir</span>
          <div className="ongkir-couriers">
            {COURIERS.map((c) => (
              <label key={c} className={`ongkir-courier ${couriers.includes(c) ? 'on' : ''}`}>
                <input type="checkbox" checked={couriers.includes(c)} onChange={() => toggleCourier(c)} />
                {c.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <button className="ongkir-btn" onClick={handleCheck} disabled={loading || !isOngkirConfigured}>
          {loading ? 'Mengecek…' : 'Cek Ongkir'}
        </button>

        {err && <div className="ongkir-err">{err}</div>}
      </div>

      {rates && (
        <div className="ongkir-card">
          <h3 style={{ marginBottom: 12 }}>Hasil ({rates.length} opsi)</h3>
          {rates.length === 0 ? (
            <div className="ongkir-empty">Tidak ada layanan untuk rute ini.</div>
          ) : (
            <table className="ongkir-table">
              <thead>
                <tr><th>Kurir</th><th>Layanan</th><th>Estimasi</th><th>Ongkir</th></tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.courier}</b></td>
                    <td>{r.service}<div className="ongkir-desc">{r.description}</div></td>
                    <td>{r.etd}</td>
                    <td>Rp {r.cost.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Ongkir;
