import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Account } from '../../App';
import { useAllConversations } from '../../hooks/useAllConversations';
import './Dashboard.css';

interface DashboardProps {
  accounts: Account[];
}

const Dashboard: React.FC<DashboardProps> = ({ accounts }) => {
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const { data: conversations = [], isLoading } = useAllConversations();

  const displayedAccounts = selectedAccount === 'all'
    ? accounts
    : accounts.filter(a => a.id === selectedAccount);

  // Conversations sesuai filter akun
  const scoped = useMemo(
    () => (selectedAccount === 'all' ? conversations : conversations.filter(c => c.accountId === selectedAccount)),
    [conversations, selectedAccount]
  );

  // Statistik nyata
  const total = scoped.length;
  const totalLead = scoped.filter(c => c.orderStatus === 'lead').length;
  const totalWaiting = scoped.filter(c => c.orderStatus === 'waiting_payment').length;
  const totalClosing = scoped.filter(c => c.orderStatus === 'closing').length;
  const winRate = total > 0 ? Math.round((totalClosing / total) * 1000) / 10 : 0;

  // Data chart: jumlah percakapan per akun, dipecah per status
  const chartData = useMemo(() => {
    return displayedAccounts.map(acc => {
      const conv = conversations.filter(c => c.accountId === acc.id);
      return {
        name: acc.name,
        Lead: conv.filter(c => c.orderStatus === 'lead').length,
        'Waiting Payment': conv.filter(c => c.orderStatus === 'waiting_payment').length,
        Closing: conv.filter(c => c.orderStatus === 'closing').length,
      };
    });
  }, [conversations, displayedAccounts]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard Analitik</h2>
        <div className="dashboard-filters" style={{ position: 'relative' }}>
          <div
            className="account-select"
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedAccount === 'all' ? (
                <span>Gabungan Semua Akun</span>
              ) : (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: displayedAccounts[0]?.color }}></div>
                  <span>{displayedAccounts[0]?.name}</span>
                </>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          {isAccountDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '4px',
              backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)', zIndex: 100, minWidth: '220px', overflow: 'hidden',
            }}>
              <div
                onClick={() => { setSelectedAccount('all'); setIsAccountDropdownOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: 'var(--font-size-sm)',
                  backgroundColor: selectedAccount === 'all' ? 'rgba(37, 211, 102, 0.08)' : 'transparent',
                  color: selectedAccount === 'all' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontWeight: selectedAccount === 'all' ? 500 : 400,
                }}
              >
                <span>Gabungan Semua Akun</span>
              </div>
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => { setSelectedAccount(acc.id); setIsAccountDropdownOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: 'var(--font-size-sm)',
                    backgroundColor: selectedAccount === acc.id ? 'rgba(37, 211, 102, 0.08)' : 'transparent',
                    color: selectedAccount === acc.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    fontWeight: selectedAccount === acc.id ? 500 : 400,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: acc.color }}></div>
                  <span>{acc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Percakapan per Akun (berdasarkan status)</h3>
        <p className="text-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          {isLoading ? 'Memuat data…' : `Total ${total} percakapan${selectedAccount === 'all' ? ' (semua akun)' : ''}`}
        </p>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} />
              <YAxis allowDecimals={false} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                itemStyle={{ color: 'var(--color-text-primary)', fontWeight: 500 }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Lead" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Waiting Payment" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Closing" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Percakapan</div>
          <div className="stat-value text-primary">{total}</div>
          <div className="stat-trend">{totalLead} lead · {totalWaiting} menunggu bayar</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Closing</div>
          <div className="stat-value text-warning">{totalClosing}</div>
          <div className="stat-trend">dari {total} percakapan</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Win Rate (Closing)</div>
          <div className="stat-value">{winRate}%</div>
          <div className="stat-trend">closing / total percakapan</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
