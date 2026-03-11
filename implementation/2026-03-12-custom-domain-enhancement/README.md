# Implementasi Custom Domain Add-on Enhancement

## Tanggal
2026-03-12

## Deskripsi
Menambahkan fitur verifikasi DNS untuk Custom Domain add-on agar user dapat setup domain sendiri.

## Hasil

### Database
- Tambah field `customDomainVerifiedAt` di tabel `addon_purchases`

### API Routes
- `GET /api/addons/[id]/verify` - Get verification status & DNS instructions
- `POST /api/addons/[id]/verify` - Verify domain (simulated)

### Frontend
- Tombol "Setup Domain" di active purchases
- Dialog DNS Instructions dengan:
  - A Record: 76.76.21.21
  - CNAME Record: cname.vercel-dns.com
  - Copy to clipboard functionality
  - Verify button

## Cara Penggunaan

1. **Beli Custom Domain** → `/dashboard/addons` → Beli paket
2. **Setup DNS** → Klik "Setup Domain" → Ikuti instruksi DNS
3. **Verifikasi** → Klik "Verifikasi Sekarang"

## File Baru/Diubah

### Modified
- `src/lib/db/schema.ts` - Tambah customDomainVerifiedAt
- `src/app/api/addons/route.ts` - Return verified fields
- `src/app/api/addons/[id]/verify/route.ts` - Verification API
- `src/app/(dashboard)/dashboard/addons/page.tsx` - DNS dialog UI

## Catatan
- Verifikasi saat ini simulated (selalu berhasil)
- Untuk production, perlu implement DNS lookup yang sebenarnya
