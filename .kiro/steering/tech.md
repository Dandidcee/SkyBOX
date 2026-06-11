# Tech Stack & Commands

## Stack
- **React 19** + **TypeScript** (~6.0)
- **Vite 8** (dev server, build, HMR)
- **ESLint 10** (flat config: `eslint.config.js`)

## Library Utama
- `react-icons` (dipakai: ikon Material `react-icons/md`, mis. `MdDashboard`, `MdChat`).
- `recharts` — grafik di Dashboard (LineChart).
- `emoji-picker-react` — emoji picker di input chat Inbox.
- `lucide-react` — tersedia (belum banyak dipakai, default-nya pakai `react-icons/md`).

## Rencana Arsitektur State (belum dipasang — lihat API_STATE_SKILL.md)
- **Client State → Zustand** (state UI murni: `activeAccountId`, `isMobileChatOpen`, `activeInboxTab`).
- **Server State → TanStack React Query** (fetch API, caching, pagination, realtime).
- Saat ini state masih lokal `useState` di `App.tsx` & komponen. Jangan tambah Redux.

## Arsitektur Backend (target)
Alur: **WAHA** → **N8N** → **Supabase** → Frontend.
- **WAHA (WhatsApp HTTP API)**: gateway WhatsApp. Setiap nomor WA = 1 **session** WAHA. Multi-WA (3-4 nomor) = 3-4 session. WAHA kirim event pesan masuk ke N8N (webhook).
- **N8N**: orkestrasi. Terima event WAHA → tulis ke Supabase, jalankan AI + scoring confidence, kirim balasan keluar via WAHA. Juga menerima webhook dari frontend (`set_handler`) untuk ubah `handler`.
- **Supabase**: database (status `handler`, `order_status`, dll) + realtime ke frontend.
- **Pemetaan multi-WA**: `accountId`/`accountPhone` di payload `set_handler` → dipakai N8N untuk memilih **session WAHA** yang benar. Jaga agar setiap `Account` di frontend selaras dengan satu session WAHA.
- Service frontend saat ini: `src/services/n8n.ts` (`setConversationHandler`). Hanya kirim sinyal + payload; kredensial WAHA/Supabase service-role hanya di sisi N8N, tidak pernah di frontend.

## Perintah (Windows / cmd)
- Dev server: `npm run dev` — **JANGAN** dijalankan via tool (long-running). Sarankan user menjalankan manual.
- Build: `npm run build` (menjalankan `tsc -b && vite build`)
- Lint: `npm run lint`
- Preview build: `npm run preview`

## Verifikasi setelah perubahan kode
Jalankan `npm run build` atau `npm run lint` untuk cek error TypeScript/lint. Jangan jalankan `npm run dev` lewat tool karena memblokir.

## Konvensi
- Komponen: functional component + hooks.
- Tipe bersama (`Account`, `Chat`) di-export dari `src/App.tsx` dan di-`import type`.
- Styling: CSS per-komponen (file `.css` berdampingan dengan `.tsx`) + CSS variables global di `src/index.css`.
- Warna/spacing/radius selalu pakai CSS variable, bukan hardcode (kecuali warna confidence & warna akun yang memang per-data).
