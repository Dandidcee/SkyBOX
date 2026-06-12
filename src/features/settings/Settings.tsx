import { useState } from 'react';
import {
  MdDarkMode, MdLightMode, MdHub, MdCloudDone, MdCloudOff,
  MdPlayArrow, MdVolumeUp, MdVolumeOff, MdLock, MdCheck, MdVisibility, MdVisibilityOff,
} from 'react-icons/md';
import { isSupabaseConfigured } from '../../services/supabase';
import { updatePassword } from '../../services/auth';
import { useSoundStore, type SoundEvent } from '../../lib/soundStore';
import { TONES, playTone } from '../../lib/sound';
import '../dashboard/Dashboard.css';
import './Settings.css';

interface SettingsProps {
  setActiveView: (view: string) => void;
}

const SoundRow = ({ event, label, desc }: { event: SoundEvent; label: string; desc: string }) => {
  const pref = useSoundStore((s) => s.prefs[event]);
  const setTone = useSoundStore((s) => s.setTone);
  const setEnabled = useSoundStore((s) => s.setEnabled);

  return (
    <div className="settings-row">
      <div>
        <div className="settings-label">{label}</div>
        <div className="settings-desc">{desc}</div>
      </div>
      <div className="sound-controls">
        <select
          className="settings-select"
          value={pref.tone}
          disabled={!pref.enabled}
          onChange={(e) => setTone(event, e.target.value)}
        >
          {TONES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <button className="settings-icon-btn" title="Coba suara" onClick={() => playTone(pref.tone)}>
          <MdPlayArrow size={18} />
        </button>
        <button
          className={`settings-icon-btn ${pref.enabled ? 'on' : 'off'}`}
          title={pref.enabled ? 'Matikan suara' : 'Aktifkan suara'}
          onClick={() => setEnabled(event, !pref.enabled)}
        >
          {pref.enabled ? <MdVolumeUp size={18} /> : <MdVolumeOff size={18} />}
        </button>
      </div>
    </div>
  );
};

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSave = async () => {
    setMsg(null);
    if (password.length < 6) {
      setMsg({ ok: false, text: 'Password minimal 6 karakter.' });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: 'Konfirmasi password tidak cocok.' });
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setMsg({ ok: true, text: 'Password berhasil diubah.' });
      setPassword('');
      setConfirm('');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Gagal mengubah password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-card">
      <div className="settings-row">
        <div>
          <div className="settings-label">Ganti Password</div>
          <div className="settings-desc">Ubah password akun admin kamu. Tidak perlu email.</div>
        </div>
      </div>
      <div className="change-password">
        <div className="cp-input-wrap">
          <MdLock size={16} className="cp-icon" />
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Password baru"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button type="button" className="cp-eye" onClick={() => setShowPass((s) => !s)} title={showPass ? 'Sembunyikan' : 'Tampilkan'}>
            {showPass ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
          </button>
        </div>
        <div className="cp-input-wrap">
          <MdLock size={16} className="cp-icon" />
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Ulangi password baru"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
          />
        </div>
        <button className="settings-btn" onClick={handleSave} disabled={loading}>
          <MdCheck size={18} />
          <span>{loading ? 'Menyimpan…' : 'Simpan Password'}</span>
        </button>
      </div>
      {msg && <div className={`cp-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
    </div>
  );
};

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

      <h3 className="settings-section-title">Akun</h3>
      <ChangePassword />

      <h3 className="settings-section-title">Notifikasi Suara</h3>
      <div className="settings-card">
        <SoundRow event="incoming" label="Pesan Masuk" desc="Bunyi saat ada chat baru dari pelanggan." />
        <SoundRow event="lowConfidence" label="Confidence AI Rendah" desc="Bunyi saat chat dialihkan otomatis ke manusia." />
        <SoundRow event="error" label="Error / Workflow Gagal" desc="Bunyi saat ada notifikasi error dari sistem." />
      </div>

      <div className="settings-about">
        SkyBox CRM · by SkyFlowID · 1 CS multi-akun WhatsApp (WAHA → N8N → Supabase)
      </div>
    </div>
  );
};

export default Settings;
