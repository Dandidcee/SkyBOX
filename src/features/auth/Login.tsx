import { useState } from 'react';
import {
  MdMail, MdLock, MdLogin, MdPersonAdd, MdVisibility, MdVisibilityOff, MdCheckCircle, MdArrowBack,
} from 'react-icons/md';
import { FaWhatsapp, FaFacebook } from 'react-icons/fa';
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
  const [isTermsOpen, setIsTermsOpen] = useState(false);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const titles: Record<Mode, { title: string; subtitle: string; cta: string; icon: React.ReactNode }> = {
    login: { title: `${getGreeting()}, Admin!`, subtitle: 'Login untuk mengelola akun WhatsApp kamu.', cta: 'Masuk', icon: <MdLogin size={18} /> },
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
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button type="button" className="login-link" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textDecoration: 'underline' }} onClick={() => setIsTermsOpen(true)}>
            Syarat & Ketentuan
          </button>
        </div>
      </form>

      {isTermsOpen && (
        <div className="cat-modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsTermsOpen(false)}>
          <div className="cat-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <div className="cat-modal-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Syarat & Ketentuan Penggunaan</h3>
            </div>
            <div style={{ padding: '20px', fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '12px', fontWeight: 500 }}>Terakhir diperbarui: 20 Juni 2026</p>
              <p style={{ marginBottom: '12px' }}>Harap membaca Syarat dan Ketentuan Penggunaan ("Perjanjian") ini dengan saksama sebelum mengakses atau menggunakan aplikasi SkyBox WA Inbox CRM ("Aplikasi"). Dengan mengakses atau menggunakan Aplikasi ini, Anda sepakat untuk terikat secara hukum oleh Perjanjian ini.</p>
              
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>1. Pemberian Lisensi</h4>
              <p>Pengembang memberikan kepada Anda hak yang terbatas, non-eksklusif, tidak dapat dialihkan, dan dapat dibatalkan untuk menggunakan Aplikasi ini semata-mata untuk tujuan operasional bisnis Anda sesuai dengan batasan yang ditetapkan dalam Perjanjian ini.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>2. Hak Kekayaan Intelektual</h4>
              <p>Seluruh hak, kepemilikan, dan kepentingan atas Aplikasi, termasuk namun tidak terbatas pada kode sumber (source code), desain antarmuka, algoritma, dan dokumentasi terkait, adalah milik eksklusif Pengembang. Anda <b>dilarang keras</b> untuk menyalin, memodifikasi, mendistribusikan ulang, membajak, atau memperjualbelikan Aplikasi ini kepada pihak ketiga, baik sebagian maupun seluruhnya, tanpa izin tertulis yang sah dari Pengembang.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>3. Penafian Tanggung Jawab (Disclaimer of Warranties)</h4>
              <p>Aplikasi ini disediakan dengan dasar "sebagaimana adanya" (<i>as is</i>) dan "sebagaimana tersedia" (<i>as available</i>). Pengembang tidak memberikan jaminan dalam bentuk apa pun, baik tersurat maupun tersirat, bahwa Aplikasi akan terbebas dari kesalahan (bug), gangguan, atau kegagalan sistem.</p>
              <p style={{ marginTop: '8px' }}>Pengembang <b>secara tegas menolak semua tanggung jawab</b> atas segala bentuk kehilangan material, kerugian finansial, kehilangan data, atau penurunan reputasi bisnis yang mungkin timbul secara langsung maupun tidak langsung dari penggunaan atau ketidakmampuan menggunakan Aplikasi ini.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>4. Kewajiban Pengguna</h4>
              <p>Anda bertanggung jawab penuh atas segala aktivitas yang terjadi di bawah akun Anda. Anda setuju untuk tidak menggunakan Aplikasi untuk tujuan ilegal, mengirimkan spam, atau melakukan tindakan yang melanggar kebijakan layanan dari penyedia pihak ketiga (seperti WhatsApp Inc.) maupun hukum yang berlaku.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>5. Penghentian Layanan</h4>
              <p>Pengembang berhak untuk secara sepihak menangguhkan atau menghentikan akses Anda ke Aplikasi kapan saja, tanpa pemberitahuan sebelumnya, apabila ditemukan indikasi kuat adanya pelanggaran terhadap Syarat dan Ketentuan ini, terutama terkait penyalahgunaan lisensi atau aktivitas pendistribusian ilegal.</p>
              
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>6. Pelaporan & Dukungan Teknis</h4>
              <p>Apabila Anda menemukan <i>bug</i>, kendala teknis darurat, indikasi kebocoran keamanan, atau mengetahui adanya pelanggaran hak cipta atas Aplikasi ini, Anda diwajibkan untuk segera melaporkannya kepada tim kami melalui kontak resmi yang tertera di bawah ini.</p>
              
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <span style={{ display: 'block', marginBottom: '12px', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hubungi Tim Support</span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <a href="https://wa.me/6282118300967" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#25D366', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <FaWhatsapp size={18} /> WhatsApp
                  </a>
                  <a href="https://www.facebook.com/dandi.dce.10" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#1877F2', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <FaFacebook size={18} /> Facebook
                  </a>
                </div>
              </div>
            </div>
            <div className="cat-modal-foot" style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
              <button className="login-btn" style={{ width: '100%', padding: '10px' }} onClick={() => setIsTermsOpen(false)}>Saya Mengerti & Setuju</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
