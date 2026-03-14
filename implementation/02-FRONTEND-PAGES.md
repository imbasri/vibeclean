# 02 - Frontend Pages

Semua halaman sudah dibuat dengan dummy data. Backend belum diimplementasi.

## Landing Page

**File:** `src/app/page.tsx`

**Fitur:**
- Hero section dengan animasi Framer Motion
- Features section
- Pricing section (3 tier: Starter, Pro, Enterprise)
- Testimonials carousel (Embla Carousel)
- CTA section
- Footer

**Status:** ✅ Selesai

---

## Auth Pages

### Login Page

**File:** `src/app/(auth)/login/page.tsx`

**Fitur:**
- Form login dengan email & password
- Validasi dengan Zod
- Link ke register
- Animasi entrance

**Status:** ✅ Selesai

### Register Page

**File:** `src/app/(auth)/register/page.tsx`

**Fitur:**
- Form registrasi (nama, email, password, konfirmasi)
- Validasi dengan Zod
- Link ke login
- Animasi entrance

**Status:** ✅ Selesai

---

## Dashboard Pages

### Layout

**File:** `src/components/layout/dashboard-layout.tsx`

**Fitur:**
- Sidebar dengan navigasi
- Branch switcher
- User menu dropdown
- Mobile responsive (Sheet untuk mobile)
- Role-based menu filtering

### Overview/Dashboard

**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Fitur:**
- Stats cards (pendapatan, pesanan, pelanggan)
- Recent orders table
- Quick actions
- Revenue chart placeholder

**Status:** ✅ Selesai

### POS (Point of Sale)

**File:** `src/app/(dashboard)/dashboard/pos/page.tsx`

**Fitur:**
- Grid layanan yang bisa dipilih
- Cart/keranjang
- Customer search
- Total calculation
- Checkout flow

**Status:** ✅ Selesai

### Orders (Pesanan)

**File:** `src/app/(dashboard)/dashboard/orders/page.tsx`

**Fitur:**
- Orders table dengan status badges
- Filter by status
- Search
- Order detail modal
- Update status

**Status:** ✅ Selesai

### Services (Layanan)

**File:** `src/app/(dashboard)/dashboard/services/page.tsx`

**Fitur:**
- Services list dengan categories
- Add/Edit service modal
- Toggle aktif/non-aktif
- Pricing per unit

**Status:** ✅ Selesai

### Customers (Pelanggan)

**File:** `src/app/(dashboard)/dashboard/customers/page.tsx`

**Fitur:**
- Customers table
- Search
- Customer detail (order history)
- Add customer

**Status:** ✅ Selesai

### Reports (Laporan)

**File:** `src/app/(dashboard)/dashboard/reports/page.tsx`

**Fitur:**
- Date range filter
- Revenue summary
- Orders summary
- Top services chart
- Export functionality (placeholder)

**Status:** ✅ Selesai

### Staff (Karyawan)

**File:** `src/app/(dashboard)/dashboard/staff/page.tsx`

**Fitur:**
- Staff list per branch
- Role badges
- Add/Edit staff modal
- Assign to branch

**Status:** ✅ Selesai

### Branches (Cabang)

**File:** `src/app/(dashboard)/dashboard/branches/page.tsx`

**Fitur:**
- Branches list
- Branch details (address, contact)
- Add/Edit branch modal
- Staff count per branch

**Status:** ✅ Selesai

### Billing (Langganan)

**File:** `src/app/(dashboard)/dashboard/billing/page.tsx`

**Fitur:**
- Current plan info
- Usage stats
- Upgrade options
- Payment history
- Invoice list

**Status:** ✅ Selesai

### Settings (Pengaturan)

**File:** `src/app/(dashboard)/dashboard/settings/page.tsx`

**Fitur:**
- Profile settings
- Business settings
- Notification preferences
- WhatsApp integration settings
- Theme toggle (dark mode)

**Status:** ✅ Selesai

---

## Shared Components

### BranchSwitcher

**File:** `src/components/layout/branch-switcher.tsx`

Dropdown untuk switch antar cabang. Otomatis update context.

### PermissionGuard

**File:** `src/components/common/permission-guard.tsx`

Komponen untuk role-based access control.

```tsx
<PermissionGuard allowedRoles={["owner", "manager"]}>
  <ProtectedContent />
</PermissionGuard>
```

### RoleBadge

**File:** `src/components/common/permission-guard.tsx`

Badge untuk menampilkan role user dengan warna berbeda.

### ThemeToggle

**File:** `src/components/common/theme-toggle.tsx`

Toggle untuk switch antara light/dark mode.

---

## Dummy Data

**File:** `src/lib/data/dummy.ts`

Berisi:
- `dummyUsers` - Users dengan roles
- `dummyOrganizations` - Organisasi
- `dummyBranches` - Cabang-cabang
- `dummyServices` - Layanan laundry
- `dummyCustomers` - Pelanggan
- `dummyOrders` - Pesanan
- Helper functions untuk simulasi API

---

## Zod Schemas

**File:** `src/lib/validations/schemas.ts`

Schemas untuk:
- Login form
- Register form
- Service form
- Customer form
- Order form
- Staff form
- Branch form
- Settings form

---

## TypeScript Types

**File:** `src/types/index.ts`

Types untuk:
- User
- Organization
- Branch
- Service
- Customer
- Order
- Role permissions
- dll.
