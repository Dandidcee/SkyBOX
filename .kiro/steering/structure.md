# Project Structure

```
src/
├── main.tsx                       # Entry point, render <App/> di StrictMode
├── App.tsx                        # Root: state global lokal + routing view + tipe Account/Chat
├── App.css
├── index.css                      # CSS variables (design tokens) + tema light/dark
├── assets/                        # hero.png, react.svg, vite.svg
├── components/
│   ├── LoadingScreen.tsx/.css     # Splash screen 2.5s saat boot
│   └── layout/
│       └── Sidebar.tsx/.css       # Navigasi kiri + account switcher + theme toggle
└── features/
    ├── dashboard/
    │   └── Dashboard.tsx/.css      # Statistik & chart NYATA dari Supabase (per akun, by status)
    ├── analytics/
    │   └── Analytics.tsx/.css      # Distribusi AI/Human, confidence, ringkasan per akun (data nyata)
    ├── settings/
    │   └── Settings.tsx/.css       # Tema, status koneksi DB, shortcut ke Integrations
    ├── notifications/
    │   └── Notifications.tsx/.css  # Riwayat notifikasi dari N8N (level info/success/warn/error)
    ├── inbox/
    │   └── Inbox.tsx/.css          # Inti: list (search aktif) + chat area + input. Tab All/AI/Human/Leads/Waiting Payment/Closing
    ├── integrations/
    │   └── Integrations.tsx/.css   # Pusat Koneksi: CRUD akun WA + config webhook/session/threshold/rekening
    └── leads/                      # (kosong — Leads kini hanya tab di dalam Inbox)

src/services/
├── supabase.ts                     # Klien Supabase anon + guard env
├── n8n.ts                          # Webhook N8N per-aksi (toggle/sendMessage/sendMedia)
├── accounts.ts                     # CRUD akun WA ke Supabase
└── mappers.ts                      # Map baris DB (snake_case) → domain (camelCase)

src/hooks/
├── useAccounts.ts                  # Query accounts + mutations CRUD
├── useConversations.ts             # Query conversations per akun + Realtime + notifikasi
├── useAllConversations.ts          # Semua conversations (Dashboard/Analytics)
├── useMessages.ts                  # Query messages per conversation + Realtime
├── useOrders.ts                    # Query orders per conversation + Realtime
├── useSystemNotifications.ts       # Dengar tabel notifications (N8N) → toast via Realtime
└── useNotificationsList.ts         # Riwayat notifikasi (halaman Notifikasi) + Realtime

src/lib/uiStore.ts                  # Zustand: notifikasi toast + status koneksi Realtime
src/components/NotificationHost.tsx # Render toast + pill status Realtime (dipasang di App)

src/types/db.ts                     # Tipe domain + tipe baris DB + enum
src/vite-env.d.ts                   # Typing env (VITE_SUPABASE_URL / ANON_KEY)
supabase/schema.sql                 # Skema DB + RLS + Realtime (jalankan di Supabase)
```

> Entry: `main.tsx` membungkus `<App/>` dengan `QueryClientProvider`. Data chat = `Conversation`+`Message` dari Supabase (tipe `Chat` mock sudah dihapus).

## Pola Arsitektur
- **State terpusat di `App.tsx`** lalu diturunkan via props (prop drilling). Belum ada state library.
- **Routing manual** lewat `activeView` (string), bukan react-router. Sidebar meng-set `activeView`.
- **Satu komponen `Inbox` untuk view `inbox`**. Leads, Waiting Payment, dan Closing bukan view terpisah lagi — jadi tab/folder di dalam Inbox (filter `orderStatus`). Saat multi-akun, `Inbox` dirender berkali-kali (satu per akun aktif).
- **View belum jadi**: tidak ada lagi placeholder. `dashboard`, `analytics`, `settings`, `integrations`, `inbox` semua punya konten nyata. Auth/login multi-CS ditunda (1 CS).

## Konvensi Penamaan File
- Komponen: `PascalCase.tsx` dengan `.css` berdampingan dengan nama sama.
- Folder fitur di `features/<nama>/`, komponen reusable di `components/`.

## Catatan
Setiap kali menambah view/fitur baru atau memindah state, **perbarui `state-and-variables.md`** agar daftar state tetap akurat.
