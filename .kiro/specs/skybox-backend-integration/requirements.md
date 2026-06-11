# Requirements Document

## Introduction

Fitur **Integrasi Backend SkyBox** menyambungkan dashboard WA Inbox CRM (React + TypeScript + Vite) yang sudah ada ke backend nyata, menggantikan data mock. Tujuannya: satu CS dapat memantau dan membalas 3–4 nomor WhatsApp sekaligus dari satu layar, dengan bantuan AI dan eskalasi otomatis ke manusia (takeover) saat keyakinan AI rendah.

Arsitektur yang disepakati: **WAHA** (gateway WhatsApp, 1 nomor = 1 session, juga host media masuk) → **N8N** (otomasi: AI, scoring, balas, alur pembayaran) → **Supabase** (database + Realtime ke dashboard). Media keluar (gambar/PDF dari CS) diunggah ke **penyimpanan media eksternal** (Cloudflare R2 / Cloudinary) untuk memperoleh URL, lalu dikirim lewat webhook. Alamat order COD dicatat ke **Google Sheets** oleh N8N.

Arah data:
- **Dashboard → N8N**: webhook per-aksi (toggle handler, kirim teks, kirim media). Tiap akun WA menyimpan kumpulan URL webhook miliknya sendiri.
- **N8N → Supabase**: menulis pesan, status, score, order.
- **Supabase → Dashboard**: Realtime (pesan masuk, perubahan handler/status/score).

Keamanan: kredensial WAHA dan Supabase `service_role` hanya berada di N8N. Frontend hanya memakai Supabase `anon key` + Row Level Security (RLS). Webhook hanya mengirim sinyal dan payload identifikasi.

**Di luar lingkup tahap ini:** autentikasi/login multi-CS, halaman Analytics, halaman Settings.

## Glossary

- **SkyBox_Dashboard**: Aplikasi frontend React + TypeScript + Vite yang dijalankan CS untuk memantau dan membalas chat. Disebut juga "Dashboard".
- **Akun_WA**: Representasi satu nomor WhatsApp bisnis di dashboard (entitas `accounts`). Satu Akun_WA dipetakan ke tepat satu session WAHA.
- **WAHA**: WhatsApp HTTP API di VPS yang menjadi gateway WhatsApp dan host media masuk. Tidak diakses langsung oleh SkyBox_Dashboard.
- **N8N**: Mesin otomasi yang menerima webhook dari SkyBox_Dashboard dan event dari WAHA, menjalankan AI dan scoring, mengirim balasan via WAHA, dan menulis ke Supabase.
- **Supabase**: Layanan database PostgreSQL dengan fitur Realtime yang menyimpan accounts, conversations, messages, dan orders.
- **Supabase_Realtime**: Kanal langganan perubahan data Supabase yang dipakai SkyBox_Dashboard untuk menerima pembaruan tanpa polling.
- **Media_Store**: Penyimpanan objek eksternal gratis (Cloudflare R2 / Cloudinary) untuk media keluar; mengembalikan URL publik.
- **Google_Sheets**: Spreadsheet tujuan pencatatan alamat order COD, ditulis oleh N8N.
- **Conversation**: Satu percakapan antara satu Akun_WA dan satu nomor pelanggan (entitas `conversations`).
- **Message**: Satu pesan dalam Conversation (entitas `messages`), berarah masuk (`in`) atau keluar (`out`).
- **Order**: Catatan transaksi pada Conversation (entitas `orders`), bertipe `tf` atau `cod`.
- **Handler**: Penanda siapa yang menangani Conversation, bernilai `ai` atau `human`.
- **Order_Status**: Status funnel Conversation, bernilai `none`, `lead`, `waiting_payment`, atau `closing`.
- **Confidence_Score**: Skor keyakinan AI untuk sebuah Conversation, bilangan bulat 0–100.
- **Confidence_Threshold**: Ambang per Akun_WA (0–100). Di bawah ambang, Conversation dialihkan ke Handler `human`.
- **Webhook_Aksi**: URL webhook N8N spesifik per aksi yang dimiliki sebuah Akun_WA: `toggleWebhookUrl`, `sendMessageWebhookUrl`, `sendMediaWebhookUrl`.
- **Anon_Key**: Kunci publik Supabase yang dipakai frontend, dibatasi oleh RLS.
- **Service_Role_Key**: Kunci penuh Supabase yang hanya dipakai N8N, tidak boleh ada di frontend.

## Requirements

### Requirement 1: Koneksi Supabase pada Frontend

**User Story:** Sebagai developer, saya ingin SkyBox_Dashboard terhubung ke Supabase memakai anon key, sehingga dashboard dapat membaca data nyata dengan aman.

#### Acceptance Criteria

1. THE SkyBox_Dashboard SHALL membaca nilai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari variabel environment saat inisialisasi.
2. THE SkyBox_Dashboard SHALL menginisialisasi satu klien Supabase memakai Anon_Key.
3. IF `VITE_SUPABASE_URL` atau `VITE_SUPABASE_ANON_KEY` tidak tersedia saat inisialisasi, THEN THE SkyBox_Dashboard SHALL menampilkan pesan kesalahan konfigurasi dan menghentikan pemuatan data.
4. THE SkyBox_Dashboard SHALL menggunakan Anon_Key untuk seluruh akses Supabase dan tidak menyertakan Service_Role_Key dalam kode atau bundel frontend.

### Requirement 2: Skema Data Supabase

**User Story:** Sebagai developer, saya ingin skema database terdefinisi jelas, sehingga frontend, N8N, dan Supabase memakai struktur data yang konsisten.

#### Acceptance Criteria

1. THE Supabase SHALL menyediakan tabel `accounts` dengan kolom identitas Akun_WA, `waha_session`, `confidence_threshold`, dan `bank_account`.
2. THE Supabase SHALL menyediakan tabel `conversations` dengan kolom `account_id`, `customer_phone`, `handler`, `order_status`, dan `confidence`.
3. THE Supabase SHALL menyediakan tabel `messages` dengan kolom `conversation_id`, `direction`, `type`, `body`, `media_url`, dan `created_at`.
4. THE Supabase SHALL menyediakan tabel `orders` dengan kolom `conversation_id`, `type`, `status`, `address`, dan `amount`.
5. THE Supabase SHALL membatasi `conversations.handler` pada nilai `ai` atau `human`.
6. THE Supabase SHALL membatasi `conversations.order_status` pada nilai `none`, `lead`, `waiting_payment`, atau `closing`.
7. THE Supabase SHALL membatasi `messages.direction` pada nilai `in` atau `out`.
8. THE Supabase SHALL membatasi `messages.type` pada nilai `text`, `image`, atau `document`.
9. THE Supabase SHALL membatasi `orders.type` pada nilai `tf` atau `cod`.
10. THE Supabase SHALL menerapkan kebijakan RLS yang mengizinkan klien Anon_Key membaca `accounts`, `conversations`, `messages`, dan `orders`.

### Requirement 3: Memuat Data Multi-WA

**User Story:** Sebagai CS, saya ingin melihat 3–4 nomor WhatsApp beserta chat-nya dari data nyata, sehingga saya dapat memantau semua percakapan dalam satu layar.

#### Acceptance Criteria

1. WHEN SkyBox_Dashboard selesai inisialisasi klien Supabase, THE SkyBox_Dashboard SHALL memuat seluruh Akun_WA dari tabel `accounts`.
2. WHEN sebuah Akun_WA aktif ditampilkan, THE SkyBox_Dashboard SHALL memuat Conversation milik Akun_WA tersebut dari tabel `conversations`.
3. WHEN sebuah Conversation dibuka, THE SkyBox_Dashboard SHALL memuat Message milik Conversation tersebut dari tabel `messages` terurut menaik berdasarkan `created_at`.
4. WHILE pemuatan data dari Supabase berlangsung, THE SkyBox_Dashboard SHALL menampilkan indikator pemuatan pada area yang bersangkutan.
5. IF pemuatan data dari Supabase gagal, THEN THE SkyBox_Dashboard SHALL menampilkan pesan kesalahan dan menyediakan aksi untuk memuat ulang.
6. THE SkyBox_Dashboard SHALL menampilkan data Akun_WA dan Conversation yang dimuat tanpa menggunakan data mock.

### Requirement 4: Notifikasi Pesan Masuk via Realtime

**User Story:** Sebagai CS, saya ingin pesan masuk baru langsung muncul di dashboard, sehingga saya tidak perlu memuat ulang halaman untuk melihat percakapan terbaru.

#### Acceptance Criteria

1. WHEN SkyBox_Dashboard menampilkan sebuah Akun_WA aktif, THE SkyBox_Dashboard SHALL berlangganan Supabase_Realtime untuk perubahan tabel `messages` dan `conversations` milik Akun_WA tersebut.
2. WHEN Supabase_Realtime mengirim Message baru berarah `in`, THE SkyBox_Dashboard SHALL menambahkan Message tersebut ke Conversation terkait dan memperbarui cuplikan serta waktu pesan terakhir.
3. WHEN Supabase_Realtime mengirim Message baru berarah `in` untuk Conversation yang tidak sedang dibuka, THE SkyBox_Dashboard SHALL menambah penghitung pesan belum dibaca pada Conversation tersebut.
4. WHEN Supabase_Realtime mengirim Message baru berarah `in`, THE SkyBox_Dashboard SHALL menampilkan notifikasi pesan masuk di antarmuka.
5. WHILE sebuah Conversation sedang dibuka, WHEN Supabase_Realtime mengirim Message baru untuk Conversation tersebut, THE SkyBox_Dashboard SHALL menampilkan Message tersebut tanpa interaksi pengguna.
6. IF langganan Supabase_Realtime terputus, THEN THE SkyBox_Dashboard SHALL mencoba menyambung ulang dan menampilkan status koneksi Realtime.

### Requirement 5: Konfigurasi Akun WA di Halaman Integrations

**User Story:** Sebagai admin, saya ingin mengatur konfigurasi tiap nomor WhatsApp, sehingga setiap nomor dapat dipetakan ke session WAHA dan webhook N8N yang benar.

#### Acceptance Criteria

1. THE SkyBox_Dashboard SHALL menyediakan halaman Integrations untuk membuat, mengubah, dan menghapus Akun_WA.
2. THE SkyBox_Dashboard SHALL menyimpan untuk tiap Akun_WA: `wahaSession`, `toggleWebhookUrl`, `sendMessageWebhookUrl`, `sendMediaWebhookUrl`, `confidenceThreshold`, dan `bankAccount`.
3. THE SkyBox_Dashboard SHALL mengizinkan jumlah Webhook_Aksi per Akun_WA bertambah tanpa mengubah skema yang ada.
4. WHEN admin menyimpan konfigurasi Akun_WA, THE SkyBox_Dashboard SHALL menulis perubahan ke tabel `accounts` di Supabase.
5. IF `confidenceThreshold` yang dimasukkan berada di luar rentang 0–100, THEN THE SkyBox_Dashboard SHALL menolak penyimpanan dan menampilkan pesan validasi.
6. WHILE jumlah Akun_WA sama dengan satu, IF admin meminta menghapus Akun_WA, THEN THE SkyBox_Dashboard SHALL menolak penghapusan dan menampilkan pesan bahwa minimal satu Akun_WA harus ada.

### Requirement 6: Ambil Alih (Takeover) Handler AI/Human

**User Story:** Sebagai CS, saya ingin mengambil alih percakapan dari AI atau mengembalikannya ke AI, sehingga saya dapat menangani pelanggan secara manual saat dibutuhkan.

#### Acceptance Criteria

1. WHEN CS mengubah Handler sebuah Conversation, THE SkyBox_Dashboard SHALL mengirim permintaan ke `toggleWebhookUrl` milik Akun_WA terkait berisi `accountId`, `accountPhone`, `wahaSession`, `conversationId`, `customerPhone`, dan Handler tujuan.
2. WHEN CS mengubah Handler sebuah Conversation, THE SkyBox_Dashboard SHALL memperbarui tampilan Handler secara optimistik sebelum menerima konfirmasi.
3. IF permintaan ke `toggleWebhookUrl` gagal, THEN THE SkyBox_Dashboard SHALL mengembalikan tampilan Handler ke nilai sebelumnya dan menampilkan pesan kegagalan.
4. IF Akun_WA terkait tidak memiliki `toggleWebhookUrl`, THEN THE SkyBox_Dashboard SHALL menolak aksi takeover dan menampilkan pesan untuk melengkapi konfigurasi di halaman Integrations.
5. WHEN Supabase_Realtime mengirim perubahan `handler` untuk sebuah Conversation, THE SkyBox_Dashboard SHALL memperbarui penempatan Conversation pada tab AI Handled atau Human sesuai nilai Handler baru.

### Requirement 7: Membalas Chat dengan Teks

**User Story:** Sebagai CS, saya ingin mengirim balasan teks dari dashboard, sehingga saya dapat menjawab pelanggan tanpa membuka aplikasi WhatsApp.

#### Acceptance Criteria

1. WHEN CS mengirim balasan teks pada sebuah Conversation, THE SkyBox_Dashboard SHALL mengirim permintaan ke `sendMessageWebhookUrl` milik Akun_WA terkait berisi `accountId`, `accountPhone`, `wahaSession`, `conversationId`, `customerPhone`, dan isi teks.
2. IF isi teks balasan kosong, THEN THE SkyBox_Dashboard SHALL menolak pengiriman dan tidak memanggil webhook.
3. IF permintaan ke `sendMessageWebhookUrl` gagal, THEN THE SkyBox_Dashboard SHALL menampilkan pesan kegagalan dan mempertahankan teks pada kolom input.
4. IF Akun_WA terkait tidak memiliki `sendMessageWebhookUrl`, THEN THE SkyBox_Dashboard SHALL menolak pengiriman dan menampilkan pesan untuk melengkapi konfigurasi di halaman Integrations.
5. WHEN Supabase_Realtime mengirim Message keluar baru hasil pengiriman, THE SkyBox_Dashboard SHALL menampilkan Message tersebut pada Conversation terkait.

### Requirement 8: Membalas Chat dengan Media (Gambar/PDF)

**User Story:** Sebagai CS, saya ingin mengirim gambar atau PDF dari dashboard, sehingga saya dapat berbagi katalog, bukti, atau dokumen ke pelanggan.

#### Acceptance Criteria

1. WHEN CS memilih berkas gambar atau PDF untuk dikirim, THE SkyBox_Dashboard SHALL mengunggah berkas tersebut ke Media_Store dan memperoleh URL publik.
2. WHEN unggahan ke Media_Store berhasil, THE SkyBox_Dashboard SHALL mengirim permintaan ke `sendMediaWebhookUrl` milik Akun_WA terkait berisi `accountId`, `accountPhone`, `wahaSession`, `conversationId`, `customerPhone`, URL media, dan tipe media.
3. IF tipe berkas yang dipilih bukan gambar maupun PDF, THEN THE SkyBox_Dashboard SHALL menolak unggahan dan menampilkan pesan tipe berkas tidak didukung.
4. IF unggahan ke Media_Store gagal, THEN THE SkyBox_Dashboard SHALL menampilkan pesan kegagalan dan tidak memanggil `sendMediaWebhookUrl`.
5. IF permintaan ke `sendMediaWebhookUrl` gagal, THEN THE SkyBox_Dashboard SHALL menampilkan pesan kegagalan pengiriman media.
6. WHILE unggahan media berlangsung, THE SkyBox_Dashboard SHALL menampilkan indikator proses pengunggahan.
7. THE SkyBox_Dashboard SHALL tidak menyimpan berkas media biner di Supabase.

### Requirement 9: Monitoring AI Confidence Score

**User Story:** Sebagai CS, saya ingin melihat tingkat keyakinan AI tiap chat, sehingga saya tahu chat mana yang perlu perhatian manusia.

#### Acceptance Criteria

1. THE SkyBox_Dashboard SHALL membaca Confidence_Score tiap Conversation dari kolom `confidence` di Supabase.
2. WHERE Confidence_Score sebuah Conversation bernilai lebih besar atau sama dengan 85, THE SkyBox_Dashboard SHALL menampilkan ring berwarna biru pada Conversation tersebut.
3. WHERE Confidence_Score sebuah Conversation bernilai antara 70 dan 84 inklusif, THE SkyBox_Dashboard SHALL menampilkan ring berwarna kuning pada Conversation tersebut.
4. WHERE Confidence_Score sebuah Conversation bernilai lebih kecil dari 70, THE SkyBox_Dashboard SHALL menampilkan ring berwarna merah pada Conversation tersebut.
5. WHEN Supabase_Realtime mengirim perubahan `confidence` untuk sebuah Conversation, THE SkyBox_Dashboard SHALL memperbarui warna ring Conversation tersebut sesuai nilai baru.

### Requirement 10: Auto-Switch ke Human di Bawah Threshold

**User Story:** Sebagai CS, saya ingin chat dengan keyakinan AI rendah otomatis berpindah ke folder Human, sehingga saya dapat segera menangani percakapan yang berisiko.

#### Acceptance Criteria

1. WHEN Supabase_Realtime mengirim Conversation dengan Handler `human` akibat Confidence_Score di bawah Confidence_Threshold Akun_WA, THE SkyBox_Dashboard SHALL menempatkan Conversation tersebut pada tab Human.
2. WHEN sebuah Conversation berpindah ke tab Human melalui Realtime, THE SkyBox_Dashboard SHALL menampilkan notifikasi bahwa percakapan membutuhkan penanganan manusia.
3. THE SkyBox_Dashboard SHALL menggunakan nilai Handler dan Order_Status dari Supabase sebagai sumber kebenaran penempatan Conversation pada tab.

### Requirement 11: Alur Pembayaran Transfer (TF)

**User Story:** Sebagai admin, saya ingin alur pembayaran transfer tercermin di dashboard, sehingga saya tahu order mana yang menunggu pembayaran.

#### Acceptance Criteria

1. WHEN Supabase_Realtime mengirim Order bertipe `tf` dengan status `waiting_payment`, THE SkyBox_Dashboard SHALL menempatkan Conversation terkait pada tab Waiting Payment.
2. WHEN Supabase_Realtime mengirim Order bertipe `tf` dengan status `waiting_payment`, THE SkyBox_Dashboard SHALL menampilkan notifikasi adanya order masuk kepada admin.
3. THE SkyBox_Dashboard SHALL menampilkan nominal Order dari kolom `amount` pada Conversation dengan Order bertipe `tf`.

### Requirement 12: Alur Pembayaran COD

**User Story:** Sebagai admin, saya ingin order COD tercatat lengkap dengan alamat, sehingga pengiriman dapat diproses.

#### Acceptance Criteria

1. WHEN Supabase_Realtime mengirim Order bertipe `cod`, THE SkyBox_Dashboard SHALL menampilkan alamat order dari kolom `address` pada Conversation terkait.
2. THE SkyBox_Dashboard SHALL menampilkan status Order bertipe `cod` pada Conversation terkait sesuai kolom `status`.
3. WHEN Supabase_Realtime mengirim perubahan status Order, THE SkyBox_Dashboard SHALL memperbarui penempatan tab Conversation sesuai Order_Status baru.

### Requirement 13: Keamanan Kredensial dan Payload Webhook

**User Story:** Sebagai admin, saya ingin kredensial sensitif tidak pernah berada di frontend, sehingga sistem aman meski dashboard diakses dari peramban.

#### Acceptance Criteria

1. THE SkyBox_Dashboard SHALL hanya menyertakan payload identifikasi (`accountId`, `accountPhone`, `wahaSession`, `conversationId`, `customerPhone`, dan data aksi) dalam permintaan ke Webhook_Aksi.
2. THE SkyBox_Dashboard SHALL tidak menyertakan kredensial WAHA dalam permintaan apa pun.
3. THE SkyBox_Dashboard SHALL tidak menyertakan Service_Role_Key Supabase dalam kode, konfigurasi frontend, maupun permintaan webhook.
4. THE SkyBox_Dashboard SHALL mengakses Supabase hanya melalui Anon_Key yang dibatasi RLS.
