import { useState, useEffect } from 'react';
import {
  MdMail, MdLock, MdLogin, MdPersonAdd, MdVisibility, MdVisibilityOff, MdArrowBack,
} from 'react-icons/md';
import { FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { signIn, signUp, resetPassword } from '../../services/auth';
import { toast } from 'sonner';
import './Login.css';

type Mode = 'login' | 'register' | 'forgot';

const Login = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationPassword, setRegistrationPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('is-login-page');
    return () => document.body.classList.remove('is-login-page');
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
  };

  const friendlyError = (raw: string): string => {
    if (raw.includes('401') || raw.includes('Invalid login')) return 'Email atau password salah.';
    if (raw.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek inbox kamu untuk verifikasi.';
    if (raw.includes('already registered') || raw.includes('already been registered')) return 'Email sudah terdaftar. Silakan masuk atau gunakan Lupa Sandi.';
    if (raw.toLowerCase().includes('password')) return 'Password minimal 6 karakter.';
    if (raw.includes('Network Error')) return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
    return raw;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email wajib diisi.');
      return;
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Format email tidak valid.');
      return;
    }
    if (mode !== 'forgot' && !password) {
      toast.error('Password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        toast.success('Berhasil masuk!');
        // App pindah otomatis lewat listener onAuthChange.
      } else if (mode === 'register') {
        if (!registrationPassword.trim()) {
          setLoading(false);
          toast.error('Sandi Pendaftaran wajib diisi untuk keamanan.');
          return;
        }
        const { needsConfirmation } = await signUp(email.trim(), password, registrationPassword.trim());
        if (needsConfirmation) {
          toast.success('Akun dibuat. Cek email kamu untuk konfirmasi, lalu masuk.');
          setMode('login');
          setPassword('');
        } else {
          // Auto login setelah registrasi berhasil
          toast.success('Berhasil mendaftar dan masuk!');
          await signIn(email.trim(), password);
        }
      } else {
        await resetPassword(email.trim());
        toast.success('Link reset password sudah dikirim ke email kamu. Cek inbox/spam.');
      }
    } catch (err) {
      toast.error(friendlyError(err instanceof Error ? err.message : 'Terjadi kesalahan.'));
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

        {mode === 'register' && (
          <label className="login-field">
            <span className="login-label">Sandi Pendaftaran (Keamanan)</span>
            <div className="login-input-wrap">
              <MdLock size={18} className="login-input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Masukkan Sandi Pendaftaran"
                value={registrationPassword}
                onChange={(e) => setRegistrationPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </label>
        )}



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
        <div style={{ marginTop: '24px', textAlign: 'left' }}>
          <button type="button" className="login-link" style={{ fontSize: '12px', padding: 0 }} onClick={() => setIsTermsOpen(true)}>
            Syarat & Ketentuan
          </button>
        </div>
      </form>

      {isTermsOpen && (
        <div className="cat-modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIsTermsOpen(false);
        }}>
          <div className="cat-modal" style={{ height: 'auto', width: '90%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <div className="cat-modal-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Syarat & Ketentuan Penggunaan</h3>
            </div>
            <div style={{ padding: '20px', fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '12px', fontWeight: 500 }}>Terakhir diperbarui: 20 Juni 2026</p>
              <p style={{ marginBottom: '12px' }}>Harap membaca Syarat dan Ketentuan Penggunaan ("Perjanjian") ini dengan saksama sebelum Anda mengunduh, menginstal, mengakses, atau menggunakan aplikasi SkyBox WA Inbox CRM ("Aplikasi"). Dengan mengakses atau menggunakan Aplikasi ini, Anda secara sah menyatakan persetujuan Anda untuk terikat secara hukum oleh seluruh ketentuan yang tertuang di dalam Perjanjian ini. Apabila Anda tidak menyetujui sebagian atau seluruh persyaratan ini, Anda tidak diperkenankan untuk menggunakan Aplikasi ini.</p>
              
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>1. Pemberian Lisensi dan Batasan Penggunaan</h4>
              <p>Pengembang dengan ini memberikan kepada Anda sebuah hak dan lisensi yang bersifat sangat terbatas, non-eksklusif, tidak dapat dialihkan, dan dapat dibatalkan sewaktu-waktu untuk menggunakan Aplikasi ini. Penggunaan Aplikasi dibatasi semata-mata untuk tujuan operasional internal bisnis Anda, sesuai dengan paket dan batasan layanan yang telah disepakati bersama. Segala bentuk modifikasi, rekayasa balik (<i>reverse engineering</i>), pembongkaran kode, atau upaya untuk mengekstraksi kode sumber dari Aplikasi dilarang dengan keras.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>2. Perlindungan Hak Kekayaan Intelektual</h4>
              <p>Seluruh hak, kepemilikan, dan kepentingan secara utuh atas Aplikasi, yang meliputi namun tidak terbatas pada kode sumber (<i>source code</i>), desain antarmuka pengguna, algoritma, basis data, dan dokumentasi terkait, adalah milik eksklusif Pengembang (SkyFlowID). Anda <b>dilarang keras</b> untuk menyalin, mereproduksi, memodifikasi, mendistribusikan ulang, membajak, atau memperjualbelikan Aplikasi ini, baik sebagian maupun seluruhnya, kepada pihak ketiga tanpa izin tertulis yang sah dan eksplisit dari Pengembang.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>3. Penafian Tanggung Jawab (Disclaimer of Warranties)</h4>
              <p>Aplikasi ini didistribusikan dan disediakan dengan dasar "sebagaimana adanya" (<i>as is</i>) dan "sebagaimana tersedia" (<i>as available</i>). Pengembang sama sekali tidak memberikan jaminan dalam bentuk apa pun, baik tersurat maupun tersirat, bahwa Aplikasi akan beroperasi tanpa gangguan, akan terbebas dari kesalahan (<i>bug</i>), atau kebal terhadap kegagalan sistem maupun kerentanan keamanan.</p>
              <p style={{ marginTop: '8px' }}>Pengembang <b>secara tegas menolak seluruh pertanggungjawaban</b> atas segala bentuk kerugian material, kerugian finansial, potensi kehilangan pendapatan, kehilangan data, atau penurunan reputasi bisnis yang mungkin timbul, baik secara langsung maupun tidak langsung, dari penggunaan, penyalahgunaan, atau ketidakmampuan Anda dalam menggunakan Aplikasi ini.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>4. Kewajiban dan Kepatuhan Pengguna</h4>
              <p>Anda memikul tanggung jawab penuh atas segala bentuk aktivitas yang terjadi di bawah akun Anda. Anda dengan ini menyatakan setuju untuk tidak menggunakan Aplikasi untuk tujuan yang melanggar hukum, mengirimkan pesan sampah (<i>spam</i>), menyebarkan konten yang menyesatkan, atau melakukan tindakan apa pun yang melanggar Kebijakan Layanan dari penyedia infrastruktur pihak ketiga (termasuk namun tidak terbatas pada kebijakan resmi WhatsApp Inc.) maupun hukum positif yang berlaku di yurisdiksi Anda.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>5. Kebijakan Jam Operasional dan Layanan Dukungan Teknis (Support)</h4>
              <p>Kami menyadari pentingnya kelancaran operasional bisnis Anda. Namun demikian, layanan dukungan teknis (<i>technical support</i>), konsultasi, serta pelaporan terkait kendala Aplikasi hanya akan ditanggapi dan diproses secara aktif pada <b>jam operasional kerja resmi</b> kami, yakni mulai pukul <b>11.00 WIB hingga 20.00 WIB</b>.</p>
              <p style={{ marginTop: '8px' }}>Setiap bentuk pesan, komunikasi, pelaporan keluhan, maupun permintaan bantuan yang masuk <b>di luar jam operasional</b> tersebut <b>tidak akan ditanggapi pada hari yang sama</b>. Pesan Anda akan kami terima dan baru akan kami tindaklanjuti secara berurutan pada <b>hari kerja berikutnya</b> begitu jam operasional kami kembali dimulai. Anda diharapkan untuk memaklumi ketentuan waktu respons ini.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>6. Penangguhan dan Penghentian Layanan</h4>
              <p>Pengembang memegang hak penuh untuk secara sepihak menangguhkan, memblokir, atau menghentikan akses Anda ke dalam Aplikasi kapan saja, tanpa kewajiban memberikan pemberitahuan sebelumnya, apabila kami menemukan indikasi kuat atau bukti yang valid mengenai adanya pelanggaran terhadap Syarat dan Ketentuan ini, terutama yang berkaitan erat dengan penyalahgunaan lisensi, percobaan peretasan, atau aktivitas pendistribusian perangkat lunak secara ilegal.</p>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginTop: '16px', marginBottom: '4px' }}>7. Pelaporan dan Kontak Resmi</h4>
              <p>Apabila Anda menemukan adanya <i>bug</i>, kendala teknis darurat yang menghambat sistem, indikasi kebocoran keamanan, atau mengetahui adanya pelanggaran hak cipta atas Aplikasi ini yang dilakukan oleh pihak lain, Anda diwajibkan untuk segera melaporkannya kepada tim kami secara eksklusif melalui saluran komunikasi resmi yang tertera di bawah ini.</p>
              
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
