---

# **Business & Product Requirements Document (B-PRD): VibeClean SaaS**

## **1. Arsitektur Platform (Multi-Tenancy)**

Platform ini dibangun dengan model **Multi-tenant**, di mana Anda sebagai Founder adalah "Tuan Tanah" yang bisa mengatur semua "Penyewa" (Owner Laundry).

* **Founder/Super Admin Dashboard**: Tempat Anda memantau seluruh transaksi, mengaktifkan/menonaktifkan fitur untuk user tertentu, dan mengatur biaya admin (Platform Fee).
* **Merchant/Owner Dashboard**: Tempat pengusaha laundry mengelola cabang, karyawan, dan melihat laporan keuangan mereka sendiri.
* **Customer Tracking Page**: Halaman ringan (lightweight) untuk pelanggan laundry memantau status cucian mereka melalui WhatsApp.

---

## **2. Model Bisnis & Kontrol Founder**

Founder memiliki kendali penuh untuk melakukan "Override" atau pengaturan khusus sesuai kebutuhan user.

| Fitur | Starter (Gratis) | Pro (Monthly) | Enterprise (SaaS Premium) |
| --- | --- | --- | --- |
| **Harga** | Rp 0 | Rp 149.000 / bln | Custom (By Founder) |
| **Limit cabang** | 1 cabang | Up to 5 cabang | Unlimited |
| **Platform Fee** | Tinggi (default: Rp 2.000) | Rendah (default: Rp 500) | Negotiable |
| **Akses Founder** | Support standar | Prioritas | Full customization |

---

## **3. Sistem Add-ons & Upselling**

Sesuai keinginan Anda agar Founder bisa setting kebutuhan user, berikut adalah sistem Add-on yang bisa diaktivasi:

1. **WhatsApp Notification Pack**:
   * Sistem kuota (Credit-based).
   * Founder bisa menambah Kuota secara manual jika user membayar di luar sistem (manual transfer).

2. **Custom Domain (White-label)**:
   * User menggunakan domain sendiri (misal: `order.laundryku.com`).
   * Founder melakukan approval dan konfigurasi DNS di sisi backend.

3. **Revenue Sharing Adjustment**:
   * Founder bisa mengatur persentase potongan transaksi khusus untuk merchant besar agar mereka tetap loyal.

---

## **4. Technical Stack**

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Payment | Mayar (QRIS, VA) |
| File Upload | UploadThing |
| Email | Resend |
| UI | Shadcn/UI + Tailwind CSS |

---

## **5. Implementation Notes**

Setiap perubahan signifikan didokumentasikan di folder `implementation/`.

Contoh: lihat `implementation/2026-03-11-uploadthing/README.md`

---

## **6. Proses Bisnis & Alur Kerja (Workflow)**

### **A. Onboarding (Pendaftaran Klien)**

1. Owner Laundry daftar di `vibeclean.id`.
2. Owner melakukan verifikasi data usaha.
3. Owner mengatur "Jasa & Harga" (Misal: Cuci Kiloan Rp 7.000/kg).
4. Owner mencetak QR Code kasir untuk pembayaran.

### **B. Operasional Harian (Point of Sale)**

1. Kasir menerima pakaian -> Input berat/pcs di aplikasi.
2. Sistem hitung harga - Diskon Kupon = Total.
3. Kasir pilih "Bayar via Mayar" -> Muncul QRIS di layar.
4. Pelanggan bayar -> Status order otomatis jadi **"LUNAS"**.
5. Pelanggan dapat link tracking via WhatsApp.

### **C. Settlement & Disbursement (Pencairan Uang)**

* Uang dari pelanggan masuk ke akun Mayar yang terhubung.
* Sistem VibeClean memotong biaya admin (cuan buat kamu).
* Owner bisa menarik saldo (Withdraw) ke rekening bank mereka kapan saja.

---

## **7. Strategi Pemasaran (GTM Strategy)**

* **Target Market:** Pemilik laundry kiloan di area perkotaan, laundry sepatu, dan katering laundry ruko.
* **Channel:**
  * **Instagram/TikTok:** Konten "Life as a Laundry Owner" menggunakan VibeClean.
  * **Affiliate:** Memberikan komisi kepada pemilik laundry yang mengajak temannya pakai VibeClean (Cocok dengan minatmu di bidang *affiliate*).
  * **Direct Sales:** Menghubungi laundry-laundry di Google Maps.

---

## **8. Operasional Founder (Behind the Scene)**

Sebagai Founder, tugas harianmu adalah:

1. **Monitor Server:** Memastikan Next.js & Database Supabase berjalan lancar.
2. **Customer Success:** Menjawab kendala teknis dari Owner Laundry.
3. **Feature Update:** Terus menambah fitur berdasarkan *feedback* (Misal: Laporan Pajak atau Penggajian Karyawan).

---

## **9. Roadmap Masa Depan**

* **VibeClean Supply:** Marketplace khusus deterjen dan plastik laundry (Cuan tambahan dari *dropship/affiliate* bahan baku).
* **AI Laundry Assistant:** AI yang bisa memprediksi kapan stok deterjen habis berdasarkan jumlah cucian.

---

## **10. Implementation Status**

### ✅ Completed Features

| Feature | Location | Status |
| --- | --- | --- |
| Founder Login | `/founder/login` | ✅ Done |
| Founder Dashboard Overview | `/founder/dashboard` | ✅ Done |
| Revenue Charts | `/founder/dashboard` | ✅ Done (Recharts) |
| Organizations Management | `/founder/dashboard/organizations` | ✅ Done |
| Revenue Analytics | `/founder/dashboard/revenue` | ✅ Done |
| Subscriptions Management | `/founder/dashboard/subscriptions` | ✅ Done |
| Transaction Fee Stats | `/founder/dashboard/transaction-fee` | ✅ Done |
| Withdrawals Approval | `/founder/dashboard/withdrawals` | ✅ Done |
| Add-ons Management | `/founder/dashboard/addons` | ✅ Done |
| Revenue Sharing Settings | `/founder/dashboard/revenue-sharing` | ✅ Done |
| Platform Settings | `/founder/settings` | ✅ Done |
| Per-Tenant Subscription Override | `/api/admin/activate-subscription` | ✅ Done |
| Tax Settings (Schema + API) | `/api/settings/tax` | ✅ Done |
| Custom Domain Verification | `/dashboard/addons` | ✅ Done |
| Advanced Tax Reports | `/dashboard/reports/tax` | ✅ Done (PDF Export, Quarterly, Tax Settings Integration) |

### 🆕 Newly Implemented (Latest Session)

| Feature | Location | Status |
| --- | --- | --- |
| Revenue Chart with Period Selector | `/founder/dashboard` | ✅ Done |
| Enhanced Stats Cards (GMV, Transaction Fees) | `/founder/dashboard` | ✅ Done |
| Tax Settings Schema | `src/lib/db/schema.ts` | ✅ Done |
| Tax Settings API | `/api/settings/tax` | ✅ Done |
| Revenue Sharing Settings Schema | `src/lib/db/schema.ts` | ✅ Done |
| Revenue Sharing API | `/api/founder/revenue-sharing` | ✅ Done |
| Revenue Sharing Page UI | `/founder/dashboard/revenue-sharing` | ✅ Done |
| Advanced Tax Reports | `/dashboard/reports/tax` | ✅ Done (PDF Export, Quarterly, Branch Filter, Tax Settings Integration) |
| Employee Direct Add | `/api/staff` + UI | ✅ Done |
| Settings Page UI/UX | `/dashboard/settings` | ✅ Done |
| Member Packages POS Integration | `/dashboard/pos` | ✅ Done |
| QR Code Custom Colors | `/api/branches/[id]/qrcode` + branches UI | ✅ Done |
| QR Code at POS | PaymentQRISDialog | ✅ Done |
| Billing Page Suspense Fix | `/dashboard/billing` | ✅ Done (Fixed useSearchParams error) |
| Branch Settings Fix | `/dashboard/branches` | ✅ Done (Fixed button & QR colors) |
| Payment Flow (Create Order) | `/api/payments/public/create` | ✅ Done |
| Balance Tracking Schema | `organization_balances`, `balance_transactions` | ✅ Done |
| Webhook Balance Update | `/api/webhooks/mayar` | ✅ Done (Update owner balance on payment) |
| Balance API | `/api/balance` | ✅ Done |
| Withdrawal API | `/api/balance/withdraw` | ✅ Done |
| Balance Page UI | `/dashboard/balance` | ✅ Done |
| Zustand State Management | `src/stores/` | ✅ Done |
| Zustand Migration (POS, Orders, Layout) | POS, Orders, Dashboard Layout | ✅ Done |
| Shadcn/UI Style Update | Components + Best Practices | ✅ Done |
| New StatusBadge Component | Reusable status badges | ✅ Done |
| New Components | Accordion, AlertDialog, Collapsible, ToggleGroup | ✅ Done |

### 📁 Implementation Docs

- `implementation/2026-03-11-uploadthing/README.md`
- `implementation/2026-03-12-founder-dashboard-enhancement/README.md`
- `implementation/2026-03-12-move-admin-to-founder/README.md`
- `implementation/2026-03-12-addons-management/README.md`
- `implementation/2026-03-12-platform-settings/README.md`
- `implementation/2026-03-12-revenue-sharing/README.md`
- `implementation/2026-03-13-member-packages-pos-integration/README.md`
- `implementation/2026-03-13-balance-payment-system/README.md`
- `implementation/2026-03-14-zustand-state-management/README.md`
- `implementation/2026-03-14-shadcn-style-update/README.md`

---

## **11. Database Schema (Complete)**

### Core Tables

```typescript
// Organizations (Tenants)
organizations: pgTable({
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  slug: text().unique(),
  plan: subscriptionPlanEnum().default("starter"),
  subscriptionStatus: subscriptionStatusEnum().default("trial"),
  ownerId: uuid().references(() => users.id),
})

// Orders
orders: pgTable({
  id: uuid().defaultRandom().primaryKey(),
  orderNumber: text().unique(),
  branchId: uuid().references(() => branches.id),
  customerId: uuid().references(() => customers.id),
  subtotal: decimal(),
  discount: decimal(),
  total: decimal(),
  status: orderStatusEnum().default("pending"),
  paymentStatus: paymentStatusEnum().default("unpaid"),
  transactionFee: decimal(), // Founder's revenue per transaction
  // ... more fields
})

// Subscriptions (Billing)
subscriptions: pgTable({
  organizationId: uuid().unique(),
  plan: subscriptionPlanEnum(),
  status: subscriptionStatusEnum(),
  mayarSubscriptionId: text(),
  // ... more fields
})

// Withdrawals (Settlement)
withdrawals: pgTable({
  organizationId: uuid(),
  amount: decimal(),
  fee: decimal(),
  netAmount: decimal(),
  status: withdrawalStatusEnum(),
  bankName: text(),
  bankAccountNumber: text(),
  // ... more fields
})

// Tax Settings (NEW)
taxSettings: pgTable({
  organizationId: uuid().unique(),
  taxName: text().default("PPN"),
  taxType: taxTypeEnum(),
  taxRate: decimal(),
  isActive: boolean(),
})

// Revenue Sharing (NEW)
revenueSharingSettings: pgTable({
  organizationId: uuid().unique(),
  customFeeType: text(),
  customFeeValue: decimal(),
  founderDiscountPercent: decimal(),
})
```

---

## **12. Quick Start**

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Push schema changes to database
npm run db:push
```

---

### **Apa yang ingin Anda lakukan selanjutnya?**

1. **Affiliate System** - Sistem komisi untuk owner yang mengajak teman
2. **Advanced Tax Reports** - Laporan pajak lengkap dengan export PDF
3. **Customer Loyalty Program** - Points & rewards enhancement
4. **SMS/WhatsApp Bulk Notifications** - Kirim broadcast ke pelanggan
5. **Advanced Analytics** - Charts dan insights untuk owner

**Pilih salah satu, dan saya akan kerjakan dengan standar Senior Developer!**
