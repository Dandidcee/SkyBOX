# Product Overview

## Nama Produk
**SkyBox** — by **SkyFlowID**

Aplikasi **WA Inbox CRM**: dashboard untuk mengelola percakapan WhatsApp dari banyak akun (multi-webhook), dibantu AI, dengan alur lead & closing.

## Tujuan Utama
- Agen CS/Sales memproses ratusan pesan WhatsApp per hari dari beberapa nomor sekaligus.
- AI menangani percakapan otomatis, manusia mengambil alih (takeover) saat dibutuhkan.
- Mengubah percakapan menjadi **Lead**, lalu menjadi **Closing** (funnel penjualan).

## Konsep Inti
- **Multi-Account View**: beberapa akun WhatsApp bisa dibuka berdampingan (kolom) dalam satu layar. Jumlah kolom maksimal bergantung lebar layar.
- **AI Confidence**: setiap chat punya skor `confidence` (0–100) yang menentukan warna ring avatar & rute penanganan (AI vs Human).
  - `>= 85` Biru = Yakin (AI handle)
  - `70–84` Kuning = Cukup Yakin (AI handle)
  - `< 70` Merah = Butuh Bantuan (Human)
- **Status Order**: `orderStatus` (`none`/`lead`/`waiting_payment`/`closing`) menentukan chat masuk tab/folder Leads / Waiting Payment / Closing di dalam Inbox.
- **Handler**: `handler` (`ai`/`human`) menentukan tab AI Handled / Human, dan bisa di-toggle (takeover) via switch yang memanggil webhook N8N.

## Bahasa
UI dan komunikasi menggunakan **Bahasa Indonesia**. Tulis copy, komentar penjelas, dan dokumen dalam Bahasa Indonesia.

## Prinsip Desain (ringkas)
Function over form, high-density tapi tetap mudah dibaca, flat design + micro-border (bukan shadow tebal). Detail lengkap di `design-system.md`.
