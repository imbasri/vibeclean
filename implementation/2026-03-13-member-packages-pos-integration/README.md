# Implementasi Member Packages + POS Integration

## Tanggal
2026-03-13

## Deskripsi
Mengintegrasikan Member Packages ke dalam POS agar:
1. Kasir dapat melihat status member pelanggan dengan jelas
2. Diskon member otomatis diterapkan pada order
3. Transaksi member berkurang setelah checkout
4. Pelanggan dapat melihat status paket member mereka di halaman tracking

## Alur Baru

### Di POS (Kasir)
```
1. Kasir input nomor HP customer
       ↓
2. Sistem auto-lookup ke /api/customers/lookup
       ↓
3. Jika customer ketemu → show badge "Pelanggan Terdaftar"
       ↓
4. Cek membership → Show badge:
   "🎫 Member: Paket Gold (15% off) - Sisa: 8x bulan ini"
       ↓
5. Diskon otomatis dihitung di total
       ↓
6. Saat checkout → record transaksi ke member package
       ↓
7. Sisa transaksi berkurang (-1)
```

### Di Customer Tracking Page
```
1. Customer masuk ke /track?order=xxx
       ↓
2. Sistem lookup order dan cek membership by phone
       ↓
3. Show info paket member:
   - Nama paket
   - Diskon yang didapat
   - Sisa transaksi bulan ini
   - Max berat per order
   - Tanggal berlaku until
```

## Fitur yang Ditambahkan

### 1. POS - Member Status Badge
- Menampilkan status membership saat customer dipilih
- Show: nama paket, besar diskon, sisa transaksi
- Different styling untuk eligible vs not eligible

### 2. POS - Auto-apply Diskon
- Otomatis hitung diskon dari paket member
- Prioritas: jika ada coupon + member, apply keduanya
- Tampil di breakdown total: Diskon Member, Diskon Manual, Diskon Kupon

### 3. POS - Record Transaksi
- Setelah order berhasil, call API PUT /api/member-packages/apply
- Update `transactionsThisMonth` di database
- Sisa transaksi berkurang otomatis

### 4. Tracking Page - Show Membership
- Di halaman tracking publik (/track)
- Tampilkan card "Paket Member Anda" jika customer punya membership aktif
- Info: nama paket, diskon, sisa transaksi, max berat, expired date

### 5. Auto-create Customer
- Checkbox "Simpan sebagai pelanggan tetap" (default: ON)
- Jika customer baru dan checkbox aktif → otomatis buat customer di database
- Jika customer sudah ada → skip creation

## Files yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/app/(dashboard)/dashboard/pos/page.tsx` | Tambah member status, auto-apply discount, record transaction, auto-create customer UI |
| `src/app/api/orders/route.ts` | Tambah saveAsCustomer logic, find or create customer |
| `src/app/api/track/[orderNumber]/route.ts` | Tambah membership info di response |
| `src/app/track/page.tsx` | Tampilkan membership card di tracking page |
| `src/lib/validations/schemas.ts` | Tambah field: memberSubscriptionId, memberDiscount, saveAsCustomer |

## API Changes

### POST /api/orders
Request body tambahan:
```json
{
  "memberSubscriptionId": "uuid-optional",
  "memberDiscount": 5000,
  "saveAsCustomer": true
}
```

### POST /api/member-packages/apply (PUT)
Record transaksi setelah checkout:
```json
{
  "subscriptionId": "uuid"
}
```

### GET /api/track/[orderNumber]
Response tambahan:
```json
{
  "membership": {
    "packageName": "Gold",
    "price": 150000,
    "discountType": "percentage",
    "discountValue": 15,
    "maxWeightKg": 10,
    "maxTransactionsPerMonth": 10,
    "transactionsThisMonth": 2,
    "remainingTransactions": 8,
    "endDate": "2026-04-13"
  }
}
```

## UI Screenshots (Text Description)

### POS - Customer Section
```
┌─────────────────────────────────────────────┐
│ 👤 [Input: Nama pelanggan]                 │
│ 📱 [Input: No HP] 🔍                       │
│                                            │
│ ✓ Pelanggan terdaftar: Budi (15 orders)   │
│ 🎫 Member: Paket Gold (15% off)           │
│    Sisa: 8x bulan ini                    │
│                                            │
│ ☐ Simpan sebagai pelanggan tetap           │
└─────────────────────────────────────────────┘
```

### POS - Order Summary
```
┌─────────────────────────────────────────────┐
│ Subtotal:           Rp 70.000              │
│ Diskon Member (15%): Rp 10.500            │
│ Diskon Manual:      Rp 0                   │
│ Total Diskon:       Rp 10.500              │
│ ─────────────────────────────────────────  │
│ TOTAL:              Rp 59.500              │
└─────────────────────────────────────────────┘
```

### Tracking Page - Membership Card
```
┌─────────────────────────────────────────────┐
│ 🎫 Paket Member Anda                        │
│                                             │
│ Paket         │ Gold                        │
│ Diskon        │ 15%                         │
│ Transaksi Bln │ 2x                          │
│ Sisa Transaksi│ 8x                          │
│ Max Berat     │ 10 kg                       │
│ Berlaku Until │ 13 April 2026               │
└─────────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Customer lookup by phone works
- [ ] Member status badge shows when customer has active membership
- [ ] Member discount is calculated correctly
- [ ] Multiple discounts (member + coupon) work together
- [ ] Transaction count decreases after checkout
- [ ] Tracking page shows membership info
- [ ] Auto-create customer works when checkbox is checked
- [ ] Customer not created when checkbox is unchecked
