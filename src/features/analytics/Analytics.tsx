import { useMemo } from 'react';
import type { Account } from '../../App';
import { useAllConversations } from '../../hooks/useAllConversations';
import './Analytics.css';

interface AnalyticsProps {
  accounts: Account[];
}

const Analytics = ({ accounts }: AnalyticsProps) => {
  const { data: conversations = [], isLoading } = useAllConversations();

  const stats = useMemo(() => {
    const total = conversations.length;
    const ai = conversations.filter(c => c.handler === 'ai').length;
    const human = conversations.filter(c => c.handler === 'human').length;
    const yakin = conversations.filter(c => c.confidence >= 85).length;
    const cukup = conversations.filter(c => c.confidence >= 75 && c.confidence < 85).length;
    const bantuan = conversations.filter(c => c.confidence < 75).length;
    const avg = total > 0 ? Math.round(conversations.reduce((s, c) => s + c.confidence, 0) / total) : 0;
    return { total, ai, human, yakin, cukup, bantuan, avg };
  }, [conversations]);

  const perAccount = useMemo(
    () =>
      accounts.map(acc => {
        const conv = conversations.filter(c => c.accountId === acc.id);
        return {
          acc,
          total: conv.length,
          human: conv.filter(c => c.handler === 'human').length,
          lead: conv.filter(c => c.orderStatus === 'lead').length,
          closing: conv.filter(c => c.orderStatus === 'closing').length,
        };
      }),
    [conversations, accounts]
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Analytics</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Percakapan</div>
          <div className="stat-value text-primary">{stats.total}</div>
          <div className="stat-trend">{isLoading ? 'memuat…' : 'seluruh akun'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Ditangani AI</div>
          <div className="stat-value">{stats.ai}</div>
          <div className="stat-trend">{stats.human} oleh manusia</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Rata-rata Confidence</div>
          <div className="stat-value text-warning">{stats.avg}</div>
          <div className="stat-trend">skala 0–100</div>
        </div>
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Distribusi Keyakinan AI</h3>
        <div className="conf-bars">
          <ConfBar label="Yakin (≥85)" value={stats.yakin} total={stats.total} color="#3B82F6" />
          <ConfBar label="Cukup Yakin (75–84)" value={stats.cukup} total={stats.total} color="#EAB308" />
          <ConfBar label="Butuh Bantuan (<75)" value={stats.bantuan} total={stats.total} color="#EF4444" />
        </div>
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Ringkasan per Akun</h3>
        <table className="analytics-table">
          <thead>
            <tr><th>Akun</th><th>Total</th><th>Human</th><th>Lead</th><th>Closing</th></tr>
          </thead>
          <tbody>
            {perAccount.map(r => (
              <tr key={r.acc.id}>
                <td>
                  <span className="acc-dot" style={{ backgroundColor: r.acc.color }}></span>
                  {r.acc.name}
                </td>
                <td>{r.total}</td>
                <td>{r.human}</td>
                <td>{r.lead}</td>
                <td>{r.closing}</td>
              </tr>
            ))}
            {perAccount.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--color-text-secondary)' }}>Belum ada akun.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConfBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="conf-row">
      <span className="conf-label">{label}</span>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
      </div>
      <span className="conf-value">{value} ({pct}%)</span>
    </div>
  );
};

export default Analytics;
