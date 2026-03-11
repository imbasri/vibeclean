# Implementasi Sticky Navbar & Tax Report

## Tanggal
2026-03-12

## Deskripsi
1. Membuat sidebar sticky di dashboard
2. Menambahkan Tax Report API

## Perubahan

### 1. Sticky Navbar/Sidebar
- Header sudah sticky (`sticky top-0`)
- Ditambahkan wrapper sticky pada sidebar agar tidak hilang saat scroll
- File: `src/components/layout/dashboard-layout.tsx`

### 2. Tax Report (Laporan Pajak)
- API: `GET /api/reports/tax?year=2026`
- Menghasilkan laporan bulanan untuk pajak
- Include:
  - Total revenue per bulan
  - Total orders
  - Rata-rata nilai order
  - Estimasi pajak (0.5%)

## File Baru/Diubah

- `src/components/layout/dashboard-layout.tsx` - Sidebar sticky
- `src/app/api/reports/tax/route.ts` - Tax report API

## Cara Penggunaan

### Tax Report
```
GET /api/reports/tax?year=2026&branch=uuid
```

Response:
```json
{
  "success": true,
  "year": 2026,
  "report": [
    {
      "month": "Januari",
      "year": 2026,
      "totalRevenue": 1500000,
      "totalOrders": 50,
      "avgOrderValue": 30000,
      "taxableAmount": 1500000
    }
  ],
  "summary": {
    "yearlyTotal": 18000000,
    "yearlyOrders": 600,
    "avgOrderValue": 30000,
    "estimatedTax": 90000
  }
}
```
