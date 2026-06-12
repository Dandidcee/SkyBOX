// Normalisasi URL gambar agar bisa di-fetch langsung (browser & WAHA).
// Link share Google Drive (drive.google.com/file/d/<id>/view atau ?id=<id>)
// diubah ke bentuk CDN langsung: https://lh3.googleusercontent.com/d/<id>=w1000
// Bentuk ini mengembalikan byte gambar langsung — aman dipakai <img> maupun
// di-download server-side oleh WAHA saat mengirim media.

/** Ambil file id dari berbagai bentuk link Google Drive. */
function driveFileId(url: string): string | null {
  const m = url.match(/(?:\/d\/|[?&]id=)([\w-]{20,})/);
  return m ? m[1] : null;
}

/**
 * Ubah URL gambar menjadi bentuk yang bisa dimuat langsung.
 * - Link Google Drive → lh3.googleusercontent.com/d/<id>=w1000
 * - URL lh3 / URL lain → dibiarkan apa adanya.
 * - Kosong → string kosong.
 */
export function toDirectImageUrl(url: string | null | undefined): string {
  const u = (url ?? '').trim();
  if (!u) return '';
  if (u.includes('lh3.googleusercontent.com')) return u;
  if (u.includes('drive.google.com')) {
    const id = driveFileId(u);
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w1000`;
  }
  return u;
}
