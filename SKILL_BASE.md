# 📚 SKILL BASE & DESIGN FOUNDATION

Dokumen ini merupakan fondasi pengetahuan (*Skill Base*) yang diekstrak dari analisis berbagai aplikasi kelas dunia. Seluruh keputusan desain untuk **WA Inbox CRM** akan didasarkan pada data dan pola di bawah ini, bukan pada asumsi atau selera pribadi.

---

## BAGIAN 1 - SKILL BASE (ANALISIS APLIKASI)

### 1. CRM & Customer Support (Chatwoot, Zendesk, Intercom, Freshdesk)
Aplikasi yang berfokus pada manajemen tiket, kolaborasi tim, dan membalas pesan pelanggan.
- **Typography**: 
  - Body: `14px` (Standar industri untuk SaaS Desktop).
  - Meta/Small: `12px` (Waktu, sub-teks).
  - Hierarchy: Mengandalkan ketebalan (font-weight 500/600) dibanding ukuran besar.
- **Layout**: 
  - Sidebar Utama: `240px` - `260px` (sering bisa di-collapse).
  - Panel List (Ticket/Chat): `300px` - `350px`.
  - Content Density: Menengah ke tinggi (mengutamakan jumlah informasi yang terlihat tanpa scroll).
- **Chat Interface**: 
  - List: Berisi Avatar, Nama, Snippet (1 baris max), Waktu, Status badge.
  - Bubble: Ada pemisah jelas antara Internal Note (biasanya kuning pastel) dan Balasan Eksternal.
- **Tables**: Row height `40px` - `48px`. Sangat padat informasi.
- **Buttons**: Height `32px` (Small), `36px` - `40px` (Medium/Default). Radius `4px` - `8px`.
- **Forms**: Input height selaras dengan button (`36px` - `40px`).
- **Cards**: Padding `16px` - `24px`. Shadow sangat tipis, mengandalkan border `1px` solid (warna abu-abu muda).

### 2. Chat Application (WhatsApp Web, Telegram Web, Discord, Slack)
Aplikasi yang berfokus pada komunikasi real-time, kecepatan, dan pemindaian (scanning) pesan.
- **Typography**: 
  - Body: `14px` - `15px` (WhatsApp Web / Telegram Web).
  - Waktu Pesan: `11px` - `12px` (Sangat kecil agar tidak mengganggu).
- **Layout**: 
  - Sidebar Chat List: ~`30%` dari layar atau statis di `300px` - `400px`.
- **Chat Interface**: 
  - Bubble Max-Width: `65%` - `75%` (Untuk menjaga keterbacaan, line-length tidak boleh terlalu panjang).
  - Timestamp: Sering disematkan di dalam bubble sudut kanan bawah.
  - Input Area: *Sticky* di bawah, auto-expand vertikal jika text panjang.
- **Buttons**: Jarang menggunakan button solid besar, lebih banyak *icon button* (attachment, emoji, send).
- **Cards**: Hampir tidak ada, layout didominasi list dan grid.

### 3. Productivity (Linear, Notion)
Aplikasi yang mendefinisikan standar SaaS modern dengan fokus ekstrim pada keyboard-first, kecepatan, dan desain minimalis.
- **Typography**: `14px` base. Linear menggunakan sistem font berlapis yang sangat rapi (11, 12, 13, 14, 16px maksimum).
- **Layout**: Sangat responsif. Sidebar `240px`.
- **Content Density**: Sangat Tinggi (High Density).
- **Tables**: Row height bisa serendah `32px` - `36px`.
- **Buttons**: Height `28px` - `32px` (Kecil) untuk action dalam list, `36px` untuk aksi utama. Radius `6px` - `8px`.
- **Forms**: Input dibuat seamless, sering kali tanpa border hingga difokuskan (Notion-style) atau border sangat tipis.
- **Cards**: Tanpa shadow. Hanya menggunakan warna background yang sedikit berbeda (Surface elevation) atau border halus `#E5E7EB`.

### 4. Material Design 3 (Google)
Sistem desain yang mengutamakan aksesibilitas, konsistensi lintas platform, dan *touch-target*.
- **Typography**: Body Medium `14px`, Body Large `16px`.
- **Layout**: Fleksibel, menggunakan margin/gutter standar (16px/24px).
- **Tables**: Minimum `48px` row height (fokus pada touch target).
- **Buttons**: Default height `40px`. Radius bisa *fully rounded* (pill) atau `12px`.
- **Forms**: Input height `56px` (Default MD3 Filled/Outlined). Terlalu besar untuk desktop SaaS murni.
- **Cards**: Elevasi tidak lagi pakai shadow tebal, tetapi pakai *tonal color* (warna dasar + transparansi primary).

---

## BAGIAN 2 - PATTERN ANALYSIS (PENEMUAN POLA)

Dari analisis ke-4 kategori di atas, ditemukan pola dominan untuk aplikasi Dashboard B2B & Chat:

1. **Ukuran Font Dominan**: `14px` adalah standar emas untuk Body Text di semua aplikasi SaaS desktop (Linear, Slack, Chatwoot, Zendesk). `16px` (MD3 standar) terlalu besar dan memakan ruang untuk aplikasi manajemen data padat.
2. **Ketinggian Komponen (Buttons & Inputs)**: Pola dominan untuk SaaS desktop adalah `36px` - `40px`. Ukuran `56px` dari MD3 hanya cocok untuk mobile, sedangkan ukuran `28px` dari Linear terlalu kecil untuk aplikasi yang masih membutuhkan interaksi mouse yang nyaman.
3. **Lebar Kolom (Layout)**: 
   - Sidebar Navigasi: Konvergen di `240px`.
   - List/Inbox: Konvergen di `320px`.
4. **Sudut (Border Radius)**: Tren saat ini menjauhi *fully rounded* (pill) atau *sharp* (0px). Standar konvergen di `6px` - `8px` untuk elemen interaktif (button, input), dan `12px` - `16px` untuk penampung besar (cards, modal).
5. **Elevasi (Shadow vs Border)**: Aplikasi modern (Linear, Notion, Chatwoot) meninggalkan bayangan (shadow) tebal. Kedalaman kini diciptakan menggunakan *subtle border* (`1px solid #E5E7EB`) dan perbedaan warna background (abu-abu vs putih).

---

## BAGIAN 3 - DESIGN PRINCIPLES

Berlandaskan pola di atas, ini adalah prinsip dasar desain untuk WA Inbox CRM:

1. **UX Principles (Function Over Form)**
   - Prioritaskan kecepatan pemindaian mata pengguna (skannabilitas) daripada keindahan visual murni. Pengguna agen CRM perlu memproses ratusan pesan per hari.
2. **Information Density Principles (High Density - Readable)**
   - Ruang layar sangat berharga. Tampilkan informasi sebanyak mungkin tanpa membuatnya terlihat berantakan. Gunakan *white-space* secara strategis, bukan sekadar membesarkan ukuran komponen.
3. **Accessibility Principles (Clear & Distinct)**
   - Kontras warna harus lolos standar WCAG AA (terutama warna teks sekunder).
   - *Hit area* (area yang bisa diklik) minimal harus `36x36px` untuk mouse desktop, diimbangi dengan padding internal.
4. **Layout Principles (Predictable Architecture)**
   - Navigasi selalu di kiri, konteks selalu di kanan.
   - Tidak ada pergeseran *layout* yang mengejutkan pengguna. Lebar kolom harus konsisten di seluruh halaman.
5. **Component Principles (Subtle & Flat)**
   - Hindari elemen 3D atau shadow berat. Gunakan *flat design* dengan *micro-borders* untuk memisahkan area.

---

## BAGIAN 4 - DESIGN RULES

Aturan-aturan ini tidak boleh dilanggar saat mengimplementasikan desain dan kode nantinya:

- **Rule 1: Base Font Size adalah 14px.**
  - *Reason*: Memberikan keseimbangan terbaik antara keterbacaan (readability) dan kepadatan informasi (density) pada monitor desktop.
  - *Reference*: Slack, Linear, Zendesk, Chatwoot.
- **Rule 2: Meta text dan Timestamp menggunakan 12px.**
  - *Reason*: Menurunkan hierarki visual agar tidak bersaing dengan pesan utama, namun tetap terbaca jika dicari.
  - *Reference*: WhatsApp Web, Telegram Web, Intercom.
- **Rule 3: Tinggi standar Button dan Input Form adalah 36px (Small) dan 40px (Default).**
  - *Reason*: Ukuran 40px memadai standar aksesibilitas (mendekati 44/48px) tetapi tetap efisien untuk ruang dashboard B2B dibandingkan 56px milik Material Design 3.
  - *Reference*: Zendesk, Chatwoot, sistem desain Atlassian.
- **Rule 4: Border Radius untuk elemen interaktif (Button/Input) adalah 6px - 8px.**
  - *Reason*: Bentuk pil (rounded full) tidak efisien untuk layout padat seperti tabel atau deretan *toolbars*. Radius kecil memberi kesan profesional dan rapi.
  - *Reference*: Linear, Notion, GitHub.
- **Rule 5: Lebar kolom Conversation List (Inbox) dikunci di 320px.**
  - *Reason*: Ini ukuran ideal untuk memuat Avatar, Nama (terpotong rapi), satu baris *snippet* teks, dan penanda waktu tanpa membentang terlalu jauh yang menghambat pergerakan mata (*eye-tracking*).
  - *Reference*: Slack, WhatsApp Web, macOS Mail.
- **Rule 6: Chat Bubble memiliki maksimal lebar (max-width) 70% dari Chat Area.**
  - *Reason*: Keterbacaan menurun jika panjang satu baris kalimat melebihi 70-80 karakter.
  - *Reference*: Telegram Web, WhatsApp Web, Discord.
- **Rule 7: Pemisahan antar area menggunakan Border (1px solid abu-abu terang), BUKAN Drop Shadow tebal.**
  - *Reason*: Mengurangi *visual noise* / *cognitive load*. Shadow hanya digunakan untuk elemen yang melayang sementara (*dropdown, modal, tooltip*).
  - *Reference*: Linear, Notion, Stripe Dashboard.
- **Rule 8: Row Height untuk Tabel Data Contacts minimal 40px, maksimal 48px.**
  - *Reason*: Menjaga agar daftar kontak yang ribuan jumlahnya mudah di-*scan* tanpa harus scroll berlebihan, sekaligus aman di-klik.
  - *Reference*: Freshdesk, Chatwoot, Material Design Data Tables.
