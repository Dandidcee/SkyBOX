# State & Variabel (Catatan Hidup)

> ⚠️ **WAJIB**: File ini adalah sumber kebenaran untuk semua state, props, dan tipe data.
> Setiap kali menambah / mengubah / menghapus state atau variabel penting, **perbarui file ini di langkah yang sama** agar tidak ada yang terlupa.
> Format tabel: Nama | Tipe | Lokasi | Nilai Awal | Fungsi.

---

## 1. Tipe Data Bersama (`src/App.tsx`)

### `interface Account`  (sumber: `src/types/db.ts`, di-re-export dari `App.tsx`)
| Field | Tipe | Keterangan |
|-------|------|-----------|
| `id` | `string` | ID akun WhatsApp (uuid Supabase) |
| `name` | `string` | Nama akun (edit di Sidebar / Integrations) |
| `phone` | `string` | Nomor WA bisnis |
| `color` | `string` | Warna identitas akun |
| `wahaSession` | `string` | Nama session WAHA (1 nomor = 1 session) |
| `toggleWebhookUrl` | `string` | Webhook N8N: ambil alih/kembalikan handler |
| `sendMessageWebhookUrl` | `string` | Webhook N8N: kirim teks |
| `sendMediaWebhookUrl` | `string` | Webhook N8N: kirim media (gambar/PDF) |
| `confidenceThreshold` | `number` | Batas auto-ke-human (0-100) |
| `bankAccount` | `string` | Rekening untuk alur pembayaran TF |

> **Catatan "akun"**: `Account` = **akun WhatsApp (nomor bisnis)**, BUKAN akun login CS. Akun CS/login (Supabase Auth) belum dibuat.
> **types/db.ts** juga mendefinisikan tipe target backend: `Conversation`, `Message`, `Order`, enum (`Handler`/`MessageDirection`/`MessageType`/`OrderType`), dan tipe baris DB snake_case (`AccountRow` dst) — dipakai saat wiring Supabase.

### `interface Chat` — DIHAPUS
Model `Chat` mock sudah dihapus. Data chat kini = `Conversation` + `Message` dari Supabase (lihat `types/db.ts`). Inbox memakai hooks `useConversations`/`useMessages`.

---

## 2. State Global — `App.tsx`
| State | Tipe | Nilai Awal | Fungsi |
|-------|------|-----------|--------|
| `isLoading` | `boolean` | `true` | Tampilkan LoadingScreen saat boot |
| `activeView` | `string` | `'dashboard'` | View aktif: `dashboard`/`inbox`/`analytics`/`integrations`/`settings` |
| `isSidebarVisible` | `boolean` | `true` | Tampil/sembunyi sidebar |
| `activeAccountIds` | `string[]` | `[]` | Akun yang dipilih CS. Saat render dihitung `resolvedActiveIds` (fallback ke akun pertama) |
| `windowWidth` | `number` | `window.innerWidth` | Lebar layar live untuk hitung kolom |

- `accounts` kini dari **`useAccounts()`** (React Query, bukan state mock). `accountsLoading`/`accountsError`/`refetch` untuk UI status.
- Tidak ada lagi `chats`/`defaultAccounts`/`initialChatsData`/`setOrderStatus`/`toggleHandler` di App.

### Nilai turunan (computed) di `App.tsx`
| Variabel | Rumus | Fungsi |
|----------|-------|--------|
| `maxCols` | width ≥1440→4, ≥1024→3, ≥768→2, else 1 | Maks kolom akun |
| `resolvedActiveIds` | `activeAccountIds` valid, fallback `[accounts[0].id]` | Akun aktif efektif (derive saat render) |
| `activeAccounts` | map `resolvedActiveIds`→`accounts` | Objek akun aktif |
| `effectiveCols` | `max(1, min(activeAccounts.length, maxCols))` | Jumlah kolom dirender |
| `colWidthPct` | `calc(100/effectiveCols% - gap)` | Lebar tiap kolom Inbox |

### Handler di `App.tsx`
- `toggleAccount(id)` — buka/tutup akun (berbasis `resolvedActiveIds`, minimal 1, batas per lebar layar).
- Account CRUD via `useAccountMutations()` (`add`/`update`/`remove`) → diteruskan ke Integrations sbg `onAdd`/`onUpdate`/`onDelete`, dan ke Sidebar sbg `onRenameAccount`.
- Toggle handler & kirim teks kini DI DALAM `Inbox.tsx` (bukan App).

### Integrasi Backend (data layer)
- **Hooks React Query** (`src/hooks/`): `useAccounts` + `useAccountMutations`, `useConversations(accountId)`, `useMessages(conversationId)`, `useOrders(conversationId)` — semua query + **Supabase Realtime**. `QueryClientProvider` di `main.tsx`.
- **`useConversations`** juga memicu **notifikasi** (via `useUiStore`): pesan masuk (unread naik), auto-human (handler ai→human), order TF masuk (order_status→waiting_payment), dan set status koneksi Realtime.
- **`src/lib/uiStore.ts`** (Zustand) — `notifications` + `realtime` status. **`src/components/NotificationHost.tsx`** render toast + pill koneksi (dipasang di `App`).
- **`src/services/supabase.ts`** — klien anon. **`accounts.ts`** — CRUD akun. **`mappers.ts`** — row→domain.
- **`src/services/n8n.ts`** — `callN8n(account, action, payload)` per-aksi. `setConversationHandler` (toggle), `sendTextMessage` (sendMessage), `sendMedia` (sendMedia, **base64** `{conversationId, phone, mediaType, filename, dataBase64, caption?}` — tanpa storage frontend, N8N yang teruskan).
- **`supabase/schema.sql`** — skema + RLS (read anon semua; write anon HANYA `accounts`) + Realtime + `replica identity full` (conversations/orders) + `external_message_id` (anti-dobel). Tabel `notifications` untuk pesan dari N8N.
- **Notifikasi dari N8N**: N8N `insert into notifications (level, message, account_id?)` → toast (`useSystemNotifications`, prefix `[Nama Akun]` bila `account_id` diisi) + halaman **Notifikasi** (riwayat, bisa difilter per akun / Sistem). `account_id` null = notif global/sistem. Cocok untuk lapor **workflow error**.
- Spec: `.kiro/specs/skybox-backend-integration/`.

---

## 3. State — `Sidebar.tsx`
| State | Tipe | Nilai Awal | Fungsi |
|-------|------|-----------|--------|
| `isAccountDropdownOpen` | `boolean` | `false` | Buka dropdown account switcher |
| `editingId` | `number \| null` | `null` | ID akun yang sedang diedit namanya |
| `editName` | `string` | `''` | Buffer input nama akun saat edit |
| `theme` | `string` | `data-theme` el. html / `'light'` | Tema `light`/`dark`, di-sync ke `<html data-theme>` |

- Variabel: `primaryAccount` = akun pertama dari `activeAccountIds`.
- Konstanta: `menuItems` (sidebar: dashboard, inbox, analytics, notifications, integrations, settings).
- Props masuk: `isVisible`, `toggleSidebar`, `accounts`, `activeAccountIds`, `toggleAccount`, `onRenameAccount`, `activeView`, `setActiveView`. (rename inline akun → `onRenameAccount(id,name)` yang memanggil mutation update; tidak ada `setAccounts` lagi)

---

## 4. State — `Inbox.tsx`
| State | Tipe | Nilai Awal | Fungsi |
|-------|------|-----------|--------|
| `activeTab` | `'all'\|'ai'\|'human'\|'lead'\|'waiting_payment'\|'closing'` | `'all'` | Tab/folder: AI/Human (by `handler`) + Lead/Waiting Payment/Closing (by `orderStatus`) |
| `isMobileChatOpen` | `boolean` | `false` | Buka chat area di layar kecil |
| `listWidth` | `number` | `isMultiView?240:320` | Lebar kolom list (resizable, batas 280–600px) |
| `activeConversationId` | `string \| null` | `null` | Conversation yang dibuka. Saat render dihitung `resolvedConversationId` (fallback ke conversation pertama) |
| `isFilterDropdownOpen` | `boolean` | `false` | Buka dropdown filter confidence |
| `isMoreDropdownOpen` | `boolean` | `false` | Buka menu titik tiga (Mark as Lead / Waiting Payment / Closing) |
| `filterCriteria` | `'all'\|'confidence_high'\|'confidence_med'\|'confidence_low'` | `'all'` | Filter berdasar confidence |
| `messageText` | `string` | `''` | Isi input pesan |
| `searchText` | `string` | `''` | Query pencarian (filter nama/nomor/cuplikan) |
| `isUploading` | `boolean` | `false` | Indikator proses kirim media |
| `isEmojiOpen` | `boolean` | `false` | Buka emoji picker |
| `toastMessage` | `React.ReactNode \| null` | `null` | Notifikasi toast sementara (auto hilang 3s) |

- Variabel turunan: `resolvedConversationId`, `activeConversation`. Data: `useConversations(account.id)` (list) & `useMessages(resolvedConversationId)` (timeline) — keduanya Realtime.
- Refs: `listRef`, `emojiPickerRef`, `emojiButtonRef`.
- Props masuk: `account`, `isMultiView`, `colWidth` (Inbox fetch datanya sendiri; tidak lagi terima `chats`/`onSetOrderStatus`/`onToggleHandler`).
- Shortcut keyboard: `Ctrl/Cmd + /` → toggle emoji picker.
- Switch "AI / Human" (`.handler-switch`) → `handleToggleHandler`: optimistic update cache React Query (`conversationsKey`) + `setConversationHandler` webhook + rollback bila gagal.
- **Tab/folder**: All · AI Handled · Human · Leads · Waiting Payment · Closing. AI/Human filter `handler`; Lead/Waiting Payment/Closing filter `orderStatus` (semua dari DB).
- **Kirim teks** (`handleSendText`): tombol kirim + Enter → `sendTextMessage`. Tolak kosong; sukses → bersihkan input (pesan muncul lewat Realtime); gagal → toast.
- Timeline render `messages` (in/out, text/image/document via `mediaUrl`).
- **Kirim media** (`handleFileChange`): tombol attach → file input (image/PDF, maks 10MB) → base64 → `sendMedia` webhook. State `isUploading`, ref `fileInputRef`.
- **Banner order** di atas timeline (dari `useOrders`): TF tampil `amount`+status, COD tampil `address`+status.
- Menu titik tiga "Mark as ..." DIHAPUS (status order kini bersumber dari DB/N8N, frontend read-only ke conversations).

---

## 4b. State — `Integrations.tsx` (Pusat Koneksi)
| State | Tipe | Nilai Awal | Fungsi |
|-------|------|-----------|--------|
| `isFormOpen` | `boolean` | `false` | Buka modal tambah/edit akun |
| `editingId` | `number \| null` | `null` | `null` = mode tambah; angka = edit akun id tsb |
| `form` | `AccountForm` (`Omit<Account,'id'>`) | `emptyForm` | Buffer field form akun |

- Props masuk: `accounts`, `onAdd`, `onUpdate`, `onDelete`.
- Menampilkan kartu tiap akun + config (wahaSession, n8nWebhookUrl, confidenceThreshold, bankAccount), tombol Tambah/Edit/Hapus. Diakses via menu sidebar **Integrations** atau tombol "Add Account (Webhook)".

---

## 5. State — `Dashboard.tsx`
| State | Tipe | Nilai Awal | Fungsi |
|-------|------|-----------|--------|
| `selectedAccount` | `string \| 'all'` | `'all'` | Filter akun pada statistik |
| `isAccountDropdownOpen` | `boolean` | `false` | Buka dropdown pilih akun |

- Data NYATA dari `useAllConversations()`. Stat cards (total/closing/win rate) + BarChart per akun by orderStatus. **Tidak ada mock lagi**.

## 5b. State — `Analytics.tsx` & `Settings.tsx`
- **Analytics** (`features/analytics/`): `useAllConversations()` → distribusi AI/Human, bucket confidence (yakin/cukup/butuh bantuan), tabel ringkasan per akun. Props: `accounts`.
- **Settings** (`features/settings/`): toggle tema (`data-theme`), status koneksi Supabase (`isSupabaseConfigured`), tombol ke Integrations. Props: `setActiveView`. State lokal: `theme`.

---

## 6. State — `LoadingScreen.tsx`
| `isAccountDropdownOpen` | `boolean` | `false` | Buka dropdown pilih akun |

- Variabel turunan: `data` = `useMemo(generateMockData(accounts))`, `displayedAccounts`.
- Props masuk: `accounts`.
- Catatan: data grafik masih **mock random** (`generateMockData`), 7 hari `Sen–Min`. Stat cards masih angka statis.

---

## 6. State — `LoadingScreen.tsx`
- Tidak ada state. Prop `onFinish()` dipanggil setelah `setTimeout` 2500ms.

---

## 7. Ambang & Konstanta Penting (jangan diubah tanpa alasan)
- **Confidence**: `>=85` biru `#3B82F6` (Yakin) · `70–84` kuning `#EAB308`/`#EAB308` (Cukup Yakin) · `<70` merah `#EF4444` (Butuh Bantuan).
- **Rute AI/Human**: `confidence>=70` → AI Handled · `<70` → Human.
- **Breakpoint kolom**: 1440 / 1024 / 768 px → 4 / 3 / 2 / 1 kolom.
- **List width**: default 320 (single) / 240 (multi), resize range 280–600px.
- **Loading**: 2500ms. **Toast**: 3000ms.

---

## 8. Status Backend
- **Frontend SELESAI** untuk integrasi: accounts/conversations/messages/orders via hooks React Query + Realtime; notifikasi (pesan masuk, auto-human, order TF) + indikator koneksi; kirim teks & media (base64); toggle AI/Human (optimistic+rollback); banner order TF/COD; CRUD akun.
- **conversations/messages/orders**: frontend READ-ONLY; hanya N8N yang menulis. **accounts**: bisa di-CRUD dari Integrations (RLS anon, di-flag — perketat saat ada auth).
- **Tinggal sisi N8N + WAHA**: workflow yang menerima event WAHA → tulis ke Supabase (conversations/messages/orders, set handler/confidence/order_status), dan menerima webhook `toggle`/`sendMessage`/`sendMedia` dari dashboard → aksi WAHA.
- **Perlu di Supabase**: jalankan `supabase/schema.sql` + seed `accounts`. Mapping payload WAHA: lihat catatan chat (belum difinalisasi ke `design.md`).
- **Out of scope**: auth/login multi-CS (ditunda, 1 CS). Search bar Inbox, Dashboard, Analytics, Settings SUDAH berisi data nyata (bukan placeholder/mock).
