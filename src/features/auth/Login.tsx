import { useState } from 'react';
import { MdMail, MdLock, MdLogin, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { signIn } from '../../services/auth';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // App akan otomatis pindah ke dashboard lewat listener onAuthChange.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login gagal.';
      setError(msg.includes('Invalid login') ? 'Email atau password salah.' : msg);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-logo">SkyBox</div>
          <div className="login-tagline">WA Inbox CRM · by SkyFlowID</div>
        </div>

        <h1 className="login-title">Masuk Admin</h1>
        <p className="login-subtitle">Login untuk mengelola akun WhatsApp kamu.</p>

        <label className="login-field">
          <span className="login-label">Email</span>
          <div className="login-input-wrap">
            <MdMail size={18} className="login-input-icon" />
            <input
              type="email"
              autoComplete="email"
              placeholder="admin@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </label>

        <label className="login-field">
          <span className="login-label">Password</span>
          <div className="login-input-wrap">
            <MdLock size={18} className="login-input-icon" />
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
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

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-btn" disabled={loading}>
          <MdLogin size={18} />
          <span>{loading ? 'Memproses…' : 'Masuk'}</span>
        </button>

        <p className="login-foot">
          Belum punya akun admin? Hubungi admin sistem untuk dibuatkan di Supabase.
        </p>
      </form>
    </div>
  );
};

export default Login;
