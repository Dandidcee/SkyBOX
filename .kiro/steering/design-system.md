# Design System

Sumber lengkap analisis & alasan: `SKILL_BASE.md` (root). File ini ringkasan token + aturan yang dipakai di kode.

## Design Tokens (`src/index.css`)

### Warna — Light (default)
| Token | Nilai |
|-------|-------|
| `--color-primary` | `#25D366` |
| `--color-primary-dark` | `#128C7E` |
| `--color-header-dark` | `#075E54` |
| `--color-background` | `#F8FAFC` |
| `--color-surface` | `#FFFFFF` |
| `--color-border` | `#E5E7EB` |
| `--color-text-primary` | `#1F2937` |
| `--color-text-secondary` | `#6B7280` |
| `--color-warning` | `#F59E0B` |
| `--color-error` | `#EF4444` |
| `--color-chat-bg` | `#EAE6DF` |
| `--color-input-bg` | `#EAE6DF` |
| `--color-bubble-sent` | `#D9FDD3` |
| `--color-bubble-received` | `#FFFFFF` |
| `--color-sidebar-text` | `#FFFFFF` |
| `--color-sidebar-text-muted` | `rgba(255,255,255,0.7)` |

### Warna — Dark (`[data-theme='dark']`)
Override: `--color-primary #00a884`, `--color-primary-dark #008069`, `--color-background #111b21`, `--color-surface #202c33`, `--color-border #222d34`, `--color-text-primary #e9edef`, `--color-text-secondary #8696a0`, `--color-chat-bg #0b141a`, `--color-input-bg #2a3942`, `--color-bubble-sent #005c4b`, `--color-bubble-received #202c33`.

### Tipografi
- `--font-family`: Inter, system fallback.
- Ukuran: `--font-size-xs 11px` · `--font-size-caption 12px` · `--font-size-sm 13px` · `--font-size-base 14px` (body) · `--font-size-h3 18px` · `--font-size-h2 20px` · `--font-size-h1 24px`.
- Headings `font-weight: 600`, line-height 1.2.

### Spacing
`xs 4` · `sm 8` · `md 12` · `lg 16` · `xl 24` · `2xl 32` · `3xl 48` (px).

### Border Radius
`sm 6px` (interaktif) · `md 8px` · `lg 12px` · `xl 16px` (kontainer besar).

## Aturan Desain (tidak boleh dilanggar — ringkasan SKILL_BASE.md)
1. Base font body = **14px**.
2. Meta/timestamp = **12px**.
3. Tinggi Button/Input = **36px (small) / 40px (default)**.
4. Border radius elemen interaktif = **6–8px**.
5. Lebar Conversation List = **320px** (single view).
6. Chat bubble max-width = **70%** dari chat area.
7. Pemisah area pakai **border 1px**, bukan shadow tebal. Shadow hanya untuk dropdown/modal/tooltip.
8. Row height tabel data = **40–48px**.

## Prinsip
Function over form · high-density tapi readable · kontras lolos WCAG AA · navigasi kiri, konteks kanan (layout konsisten) · flat + micro-border.

## Aturan praktis di kode
- Selalu pakai CSS variable untuk warna/spacing/radius. Hindari hardcode hex kecuali untuk warna confidence (`#3B82F6`/`#EAB308`/`#EF4444`) dan warna per-akun.
- Theme di-toggle via atribut `<html data-theme="light|dark">` (di-set dari `Sidebar.tsx`).
