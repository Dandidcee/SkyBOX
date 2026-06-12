# SkyBox — WA Inbox CRM

**SkyBox** by **SkyFlowID** adalah dashboard **CRM Inbox WhatsApp** untuk mengelola percakapan dari banyak nomor WhatsApp sekaligus, dibantu AI, dengan alur lead sampai closing. Cocok untuk tim CS/Sales yang memproses ratusan pesan per hari dari beberapa nomor bisnis.

Aplikasi ini bersifat **open source**. Silakan dipakai, dipelajari, dan dikembangkan.

> ⚠️ **Ketentuan Merek**: Merek **SkyBox** dan **SkyFlowID** beserta identitasnya **tidak boleh diubah, dihapus, atau diganti**. Kamu boleh memodifikasi kode dan fitur, tetapi nama/branding produk harus tetap dipertahankan.

---

## ✨ Fitur Utama

- **Multi-Account View** — buka beberapa nomor WhatsApp berdampingan dalam satu layar (jumlah kolom menyesuaikan lebar layar).
- **AI + Takeover Manusia** — setiap chat punya skor *confidence* (0–100). AI menangani otomatis; di bawah ambang batas otomatis diserahkan ke manusia. CS bisa ambil alih kapan saja lewat switch **AI / Human**.
- **Funnel Penjualan** — status order per percakapan: `none` → `lead` → `waiting_payment` → `closing`, tampil sebagai tab/folder di Inbox.
- **Login Multi-Admin** — setiap admin login dan hanya melihat nomor WhatsApp miliknya sendiri (diamankan Row Level Security Supabase).
- **Realtime** — pesan masuk, perubahan handler, dan order baru tampil langsung tanpa refresh.
- **Notifikasi** — toast in-app + halaman riwayat notifikasi, plus **notifikasi suara** yang bisa dipilih & dinonaktifkan per jenis event.
- **Dashboard & Analytics** — statistik dan grafik nyata dari database (per akun, per status).
- **Kirim Teks & Media** — balas pelanggan langsung dari dashboard (teks, gambar, PDF).

---

## 🏗️ Arsitektur

```
WhatsApp  ──►  WAHA  ──►  N8N  ──►  Supabase  ──►  Dashboard (frontend ini)
                            ▲                            │
                            └──────── webhook ───────────┘
                              (toggle / kirim pesan / media)
```

- **WAHA (WhatsApp HTTP API)** — gateway WhatsApp. Setiap nomor WA = 1 *session* WAHA.
- **N8N** — orkestrasi: terima event WAHA → tulis ke Supabase, jalankan AI + scoring confidence, kirim balasan via WAHA. Juga menerima webhook dari dashboard.
- **Supabase** — database (PostgreSQL) + Auth + Realtime ke frontend.
- **Frontend (repo ini)** — React + TypeScript + Vite. Hanya membaca data lewat *anon key* + RLS, dan mengirim sinyal/webhook ke N8N.

> 🔒 **Keamanan**: kredensial sensitif (service_role Supabase, kredensial WAHA) **hanya** berada di sisi N8N — **tidak pernah** ada di frontend. Frontend hanya memakai *anon key* yang dibatasi RLS.

---

## 🧰 Teknologi

- **React 19** + **TypeScript**
- **Vite** (dev server, build, HMR)
- **TanStack React Query** (server state) + **Zustand** (client/UI state)
- **Supabase JS** (database, auth, realtime)
- **Recharts** (grafik), **react-icons**, **emoji-picker-react**

---

## 🚀 Cara Menjalankan (Lokal)

### 1. Prasyarat
- Node.js 18+ dan npm
- Akun & project [Supabase](https://supabase.com)

### 2. Install
```bash
git clone https://github.com/Dandidcee/SkyBOX.git
cd SkyBOX
npm install
```

### 3. Konfigurasi environment
Salin `.env.example` menjadi `.env`, lalu isi:
```dotenv
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
Ambil nilainya di Supabase: **Project Settings → API**. Gunakan kunci **anon/public** saja, **jangan** taruh `service_role` di frontend.

> URL webhook N8N **tidak** diatur di `.env` — diatur per-akun langsung di dashboard (menu **Integrations**).

### 4. Siapkan database Supabase
Jalankan skrip `supabase/schema.sql` di **Supabase → SQL Editor**. Skrip ini membuat seluruh tabel, fungsi, Realtime, dan kebijakan **Row Level Security**.

### 5. Buat admin pertama
Di Supabase: **Authentication → Users → Add user** (isi email + password, centang **Auto Confirm User**).

Setelah punya akun WhatsApp di tabel `accounts`, kaitkan ke admin tersebut (ambil UUID user dari halaman Users):
```sql
update accounts set owner_id = '<uuid-admin>' where owner_id is null;
```

### 6. Jalankan
```bash
npm run dev      # mode development (http://localhost:5173)
npm run build    # build produksi
npm run preview  # pratinjau hasil build
npm run lint     # cek lint / TypeScript
```

---

## 📁 Struktur Singkat

```
src/
├── App.tsx                # Root: routing view + state global + gating login
├── components/            # Sidebar, LoadingScreen, NotificationHost
├── features/              # auth, dashboard, inbox, analytics, settings, integrations, notifications
├── hooks/                 # React Query + Supabase Realtime (accounts, conversations, messages, orders, ...)
├── services/              # supabase, auth, accounts, n8n (webhook), mappers
├── lib/                   # uiStore & soundStore (Zustand), sound
└── types/                 # tipe domain + tipe baris DB
supabase/schema.sql        # Skema DB + RLS + Realtime (jalankan di Supabase)
```

---

## 🤝 Kontribusi

Kontribusi terbuka. Silakan fork, buat branch fitur, dan ajukan Pull Request. Mohon jaga konsistensi gaya kode dan **jangan mengubah merek/identitas SkyBox & SkyFlowID**.

---

## 📜 Lisensi

Open source. Penggunaan, modifikasi, dan distribusi diperbolehkan dengan syarat **merek SkyBox by SkyFlowID tetap dipertahankan dan tidak diubah**.

---

Dibuat dengan ❤️ oleh **SkyFlowID**.
