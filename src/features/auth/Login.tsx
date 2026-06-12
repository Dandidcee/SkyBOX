import { useState } from 'react';
import {
  MdMail, MdLock, MdLogin, MdPersonAdd, MdVisibility, MdVisibilityOff, MdCheckCircle, MdArrowBack,
} from 'react-icons/md';
import { signIn, signUp, resetPassword } from '../../services/auth';
import './Login.css';

type Mode = 'login' | 'register' | 'forgot';

const Login = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setPassword('');
  };

  const friendlyError = (raw: string): string => {
    if (raw.includes('Invalid login')) return 'Email atau password salah.';
    if (raw.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox kamu untuk verifikasi.';
    if (raw.includes('already registered') || raw.includes('already been registered')) return 'Email sudah terdaftar. Silakan masuk atau gunakan Lupa Sandi.';
    if (raw.toLowerCase().includes('password')) return 'Password minimal 6 karakter.';
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }
    if (mode !== 'forgot' && !password) {
      setError('Password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        // App pindah otomatis lewat listener onAuthChange.
      } else if (mode === 'register') {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setInfo('Akun dibuat. Cek email kamu untuk konfirmasi, lalu masuk.');
          setMode('login');
          setPassword('');
        }
        // Bila tanpa konfirmasi, session langsung aktif → App pindah otomatis.
      } else {
        await resetPassword(email.trim());
        setInfo('Link reset password sudah dikirim ke email kamu. Cek inbox/spam.');
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, { title: string; subtitle: string; cta: string; icon: React.ReactNode }> = {
    login: { title: 'Masuk Admin', subtitle: 'Login untuk mengelola akun WhatsApp kamu.', cta: 'Masuk', icon: <MdLogin size={18} /> },
    register: { title: 'Daftar Admin', subtitle: 'Buat akun admin baru untuk SkyBox.', cta: 'Daftar', icon: <MdPersonAdd size={18} /> },
    forgot: { title: 'Lupa Sandi', subtitle: 'Masukkan email, kami kirim link reset password.', cta: 'Kirim Link Reset', icon: <MdMail size={18} /> },
  };
  const t = titles[mode];

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-logo"><span className="logo-sky">Sky</span><span className="logo-box">Box</span></div>
          <div className="login-tagline">WA Inbox CRM · by SkyFlowID</div>
        </div>

        <h1 className="login-title">{t.title}</h1>
        <p className="login-subtitle">{t.subtitle}</p>

        <label className="login-field">
          <span className="login-label">Email</span>
          <div className="login-input-wrap">
            <MdMail size={18} className="login-input-icon" />
            <input
              type="text"
              autoComplete="username"
              placeholder="admin@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </label>

        {mode !== 'forgot' && (
          <label className="login-field">
            <span className="login-label">Password</span>
            <div className="login-input-wrap">
              <MdLock size={18} className="login-input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPass((s) => !s)}
                title={showPass ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPass ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
              </button>
            </div>
          </label>
        )}

        {error && <div className="login-error">{error}</div>}
        {info && <div className="login-info"><MdCheckCircle size={16} /> <span>{info}</span></div>}

        <button type="submit" className="login-btn" disabled={loading}>
          {t.icon}
          <span>{loading ? 'Memproses…' : t.cta}</span>
        </button>

        <div className="login-switch">
          {mode === 'login' && (
            <button type="button" className="login-link" onClick={() => switchMode('register')}>Daftar admin baru</button>
          )}
          {mode === 'register' && (
            <button type="button" className="login-link" onClick={() => switchMode('login')}>
              <MdArrowBack size={14} /> Sudah punya akun? Masuk
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" className="login-link" onClick={() => switchMode('login')}>
              <MdArrowBack size={14} /> Kembali ke Masuk
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Login;
