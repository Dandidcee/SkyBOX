# 🧠 SKILL BASE: STATE & API ARCHITECTURE

Dokumen ini merupakan panduan arsitektur (Skill Base) untuk menangani *State Management* di Frontend dan struktur antarmuka API Backend aplikasi WA Inbox CRM.

---

## 1. STRATEGI STATE MANAGEMENT (FRONTEND)

Untuk menjaga performa aplikasi tetap ringan, kita tidak akan menggunakan Redux yang berat. Kita menggunakan kombinasi modern:

### A. Client State (Zustand)
Digunakan untuk menyimpan *state* murni UI yang tidak berasal dari database.
- **Variabel Global**:
  - `activeAccountId`: Menyimpan ID akun WhatsApp (Webhook) yang sedang dipilih.
  - `isMobileChatOpen`: Status tampilan UI di layar kecil.
  - `activeInboxTab`: Status filter inbox (All / AI Handled / Human).
- **Alasan**: *Zustand* sangat ringan, cepat, dan tidak memerlukan *Provider wrapper* yang rumit.

### B. Server State (TanStack React Query)
Digunakan khusus untuk memanggil API, *caching*, sinkronisasi, dan *pagination*.
- **Keuntungan**: Tidak perlu membuat variabel `isLoading` atau `isError` secara manual. React Query otomatis menangani *cache* pesan chat agar aplikasi terasa instan saat berpindah-pindah percakapan.

---

## 2. STRUKTUR DATABASE / ENTITAS UTAMA

Entitas inti yang akan saling berelasi di *backend*:
1. **Account**: Menyimpan data koneksi Webhook WhatsApp.
2. **Conversation**: Sesi obrolan antara Akun dan Pelanggan. Memiliki status (`active`, `lead`, `resolved`) dan *handler* (`ai`, `human`).
3. **Message**: Pesan individual di dalam *Conversation*.
4. **Customer/Contact**: Profil pelanggan (Nama, Nomor Telepon, Tags).

---

## 3. RANCANGAN API BACKEND (RESTful)

*Backend* harus menyediakan *endpoints* berikut agar *frontend* bisa berfungsi penuh:

### 1. Account & Webhook Management
- `GET /api/v1/accounts` -> Mengambil daftar akun WhatsApp yang terhubung.
- `POST /api/v1/accounts` -> Menambahkan akun baru (Menerima input Webhook URL & Nama).
- `PUT /api/v1/accounts/:id` -> Mengubah nama akun.

### 2. Inbox & Conversations
- `GET /api/v1/conversations?account_id={id}&status=active&handler={all|ai|human}` -> Mengambil daftar *chat* untuk panel sebelah kiri.
- `GET /api/v1/conversations/:id/messages` -> Mengambil *timeline* chat secara spesifik.
- `POST /api/v1/conversations/:id/messages` -> Mengirim balasan ke pelanggan.
- `PATCH /api/v1/conversations/:id/takeover` -> Agen manusia mengambil alih *chat* dari AI (Mengubah `handler` menjadi `human`).

### 3. Leads Management
- `PATCH /api/v1/conversations/:id/mark-lead` -> Mengubah status *chat* menjadi "Lead" (Otomatis menyembunyikannya dari daftar Inbox utama).
- `GET /api/v1/leads` -> Mengambil daftar pelanggan yang berstatus Lead.

### 4. Realtime Synchronization
- **WebSocket (Socket.io/Pusher)**: *Backend* harus memancarkan *event* WebSocket setiap kali ada pesan WhatsApp masuk dari Webhook agar *frontend* bisa ter- *update* instan tanpa *refresh*.
