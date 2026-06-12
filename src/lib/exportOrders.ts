// Ekspor daftar order ke CSV (Excel) & PDF (via print browser).
// Tanpa dependency tambahan.

export interface ExportOrderRow {
  createdAt: string;
  customerName: string;
  customerPhone: string;
  account: string;
  items: string;
  address: string | null;
  note: string;
  method: string;     // "Transfer" / "COD"
  amount: number | null;
  phase: string;
  verified: boolean;
}

const COLUMNS = [
  'Tanggal Order', 'Pelanggan', 'No HP', 'Akun', 'Barang Dipesan',
  'Alamat', 'Catatan Pengiriman', 'Metode', 'Nominal', 'Fase', 'Verifikasi',
];

const fmtDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtAmount = (n: number | null) => (n != null ? `Rp ${n.toLocaleString('id-ID')}` : '-');

const rowValues = (o: ExportOrderRow) => [
  fmtDate(o.createdAt),
  o.customerName || o.customerPhone || '-',
  o.customerPhone || '-',
  o.account || '-',
  o.items || '-',
  o.address || '-',
  o.note || '-',
  o.method,
  fmtAmount(o.amount),
  o.phase || '-',
  o.verified ? 'Terverifikasi' : 'Belum',
];

// ---------- CSV (Excel) ----------
export function exportOrdersCSV(rows: ExportOrderRow[], filename = 'tracking-order') {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    COLUMNS.map(esc).join(','),
    ...rows.map((o) => rowValues(o).map((v) => esc(String(v))).join(',')),
  ];
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM agar Excel baca UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

// ---------- PDF (print browser) ----------
const escHtml = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function printOrdersPDF(rows: ExportOrderRow[], title = 'Tracking Order') {
  const today = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const head = COLUMNS.map((c) => `<th>${escHtml(c)}</th>`).join('');
  const body = rows.map((o) => {
    const tds = rowValues(o).map((v, i) => `<td class="c${i}">${escHtml(v)}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1F2937; margin: 24px; }
  .brand { font-size: 22px; font-weight: 800; }
  .brand .box { color: #25D366; }
  .sub { color: #6B7280; font-size: 12px; margin-top: 2px; }
  .meta { color: #6B7280; font-size: 12px; margin: 6px 0 16px; }
  h1 { font-size: 16px; margin: 12px 0 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; vertical-align: top; }
  thead th { background: #075E54; color: #fff; font-weight: 600; }
  tbody tr:nth-child(even) { background: #F8FAFC; }
  .c8 { white-space: nowrap; font-weight: 600; }
  .c0 { white-space: nowrap; }
  .footer { margin-top: 16px; color: #9CA3AF; font-size: 10px; text-align: center; }
  @media print { body { margin: 12mm; } thead { display: table-header-group; } }
</style></head>
<body>
  <div class="brand">Sky<span class="box">Box</span></div>
  <div class="sub">WA Inbox CRM · by SkyFlowID</div>
  <h1>${escHtml(title)}</h1>
  <div class="meta">Dicetak: ${escHtml(today)} · Total: ${rows.length} order</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <div class="footer">SkyBox · Tracking Order</div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
