import { useState } from 'react';
import { MdDarkMode, MdLightMode, MdHub, MdCloudDone, MdCloudOff } from 'react-icons/md';
import { isSupabaseConfigured } from '../../services/supabase';
import '../dashboard/Dashboard.css';
import './Settings.css';

interface SettingsProps {
  setActiveView: (view: string) => void;
}

const Settings = ({ setActiveView }: SettingsProps) => {
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-label">Tema Tampilan</div>
            <div className="settings-desc">Pilih mode terang atau gelap.</div>
          </div>
          <button className="settings-btn" onClick={toggleTheme}>
            {theme === 'light' ? <MdDarkMode size={18} /> : <MdLightMode size={18} />}
            <span>{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Koneksi Database</div>
            <div className="settings-desc">Status konfigurasi Supabase.</div>
          </div>
          <div className={`settings-status ${isSupabaseConfigured ? 'ok' : 'off'}`}>
            {isSupabaseConfigured ? <MdCloudDone size={18} /> : <MdCloudOff size={18} />}
            <span>{isSupabaseConfigured ? 'Terhubung' : 'Belum diatur'}</span>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Akun WhatsApp</div>
            <div className="settings-desc">Kelola nomor, session WAHA, dan webhook N8N.</div>
          </div>
          <button className="settings-btn" onClick={() => setActiveView('integrations')}>
            <MdHub size={18} />
            <span>Buka Integrations</span>
          </button>
        </div>
      </div>

      <div className="settings-about">
        SkyBox CRM · by SkyFlowID · 1 CS multi-akun WhatsApp (WAHA → N8N → Supabase)
      </div>
    </div>
  );
};

export default Settings;
