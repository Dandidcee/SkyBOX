import { useState } from 'react';
import { MdLock, MdCheck, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { updatePassword } from '../../services/auth';
import './Login.css';

interface ResetPasswordProps {
  onDone: () => void;
}

const ResetPassword = ({ onDone }: ResetPasswordProps) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah password.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-logo"><span className="logo-sky">Sky</span><span className="logo-box">Box</span></div>
          <div className="login-tagline">WA Inbox CRM · by SkyFlowID</div>
        </div>

        <h1 className="login-title">Set Sandi Baru</h1>
        <p className="login-subtitle">Masukkan password baru untuk akun kamu.</p>

        <label className="login-field">
          <span className="login-label">Password Baru</span>
          <div className="login-input-wrap">
            <MdLock size={18} className="login-input-icon" />
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
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

        <label className="login-field">
          <span className="login-label">Ulangi Password</span>
          <div className="login-input-wrap">
            <MdLock size={18} className="login-input-icon" />
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </div>
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-btn" disabled={loading}>
          <MdCheck size={18} />
          <span>{loading ? 'Menyimpan…' : 'Simpan Password'}</span>
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
