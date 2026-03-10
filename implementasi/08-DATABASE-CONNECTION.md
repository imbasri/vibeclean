# 08-DATABASE-CONNECTION.md

## Phase 3: Connect Frontend to Database

Dokumentasi ini mencatat semua perubahan yang dilakukan untuk menghubungkan frontend ke database PostgreSQL, menghilangkan dependency pada dummy data, dan menggunakan API routes yang sudah ada.

---

## Overview

Sebelumnya, aplikasi menggunakan `dummyServices`, `dummyBranches`, dll dari `src/lib/data/dummy.ts`. Sekarang, semua data diambil dari database PostgreSQL melalui API routes.

### Perubahan Utama:
1. **AuthContext** - Fetch user permissions dari API instead of dummy data
2. **POS Page** - Menggunakan `useServices` dan `useOrders` hooks
3. **Onboarding API** - Auto-create organization untuk user baru
4. **Utils** - Pindahkan `formatCurrency`, `formatDate` dari dummy.ts ke utils.ts

---

## Files Created

### 1. `/api/user/permissions/route.ts`
API endpoint untuk fetch user permissions dari database.

**Response:**
```typescript
{
  user: { id, email, name, phone, image, emailVerified, createdAt, updatedAt },
  organization: { id, name, slug, plan, subscriptionStatus, trialEndsAt },
  branches: [{ id, name, address, phone, isActive }],
  permissions: [{ branchId, branchName, roles: ["owner", "manager", etc] }],
  needsOnboarding: boolean  // true if user has no organization
}
```

### 2. `/api/onboarding/initialize/route.ts`
API endpoint untuk initialize organization baru untuk user yang baru register.

**POST Request (optional body):**
```typescript
{
  organizationName?: string,  // Default: "Laundry {userName}"
  branchName?: string,        // Default: "Cabang Utama"
  branchAddress?: string,
  branchPhone?: string
}
```

**Response:**
```typescript
{
  success: true,
  organization: { id, name, slug, plan, trialEndsAt },
  branch: { id, name }
}
```

**GET Request:**
Check if user needs onboarding.

---

## Files Modified

### 1. `src/contexts/auth-context.tsx`

**Changes:**
- Removed import dari `dummyBranches`
- Added `needsOnboarding` state
- Fetch permissions dari `/api/user/permissions` instead of dummy data
- Auto-onboarding: saat `needsOnboarding=true`, otomatis panggil `/api/onboarding/initialize`

**New Flow:**
```
User Login → AuthContext.fetchUserPermissions() 
  → API returns needsOnboarding=true 
  → Auto-call /api/onboarding/initialize
  → Refresh permissions
  → User now has organization & branch
```

### 2. `src/app/(dashboard)/dashboard/pos/page.tsx`

**Changes:**
- Removed `dummyServices` import
- Added `useServices({ branchId: activeBranch?.id, isActive: "active" })`
- Added `useOrders({ branchId: activeBranch?.id })`
- `handleCheckout()` now calls `createOrder()` from hook instead of simulating
- Added loading state for services
- Added error handling for services
- Import `formatCurrency` from `@/lib/utils` instead of dummy

### 3. `src/lib/utils.ts`

**Added Functions:**
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string { ... }
export function formatDateTime(date: Date): string { ... }
```

### 4. Multiple Dashboard Pages
Updated import dari `formatCurrency`, `formatDate` ke `@/lib/utils`:
- `dashboard/orders/page.tsx`
- `dashboard/customers/page.tsx`
- `dashboard/services/page.tsx`
- `dashboard/reports/page.tsx`
- `dashboard/billing/page.tsx`
- `dashboard/page.tsx`
- `dashboard/staff/page.tsx`
- `dashboard/branches/page.tsx`

---

## Data Flow Diagram

```
┌─────────────────┐
│   User Login    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────┐
│  AuthProvider   │────▶│ /api/user/permissions│
└────────┬────────┘     └──────────┬───────────┘
         │                         │
         │                         ▼
         │              ┌──────────────────────┐
         │              │     Database         │
         │              │  - organization_members│
         │              │  - branch_permissions │
         │              │  - branches          │
         │              │  - organizations     │
         │              └──────────────────────┘
         │
         ▼
┌─────────────────┐
│ needsOnboarding?│
├─────┬───────────┤
│ YES │    NO     │
└──┬──┴─────┬─────┘
   │        │
   ▼        ▼
┌─────────────────┐     ┌───────────────┐
│/api/onboarding/ │     │  User Ready   │
│   initialize    │     │  Dashboard    │
└────────┬────────┘     └───────────────┘
         │
         ▼
┌─────────────────┐
│ Creates:        │
│ - Organization  │
│ - Branch        │
│ - Membership    │
│ - Permission    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Refresh Perms   │
└─────────────────┘
```

---

## Testing

### Manual Testing:
1. **Register new user** → Should auto-create organization
2. **Login** → Should see dashboard with branch "Cabang Utama"
3. **POS Page** → Should load services from database
4. **Create Order** → Should save to database

### Verify Database:
```sql
-- Check organizations
SELECT * FROM organizations;

-- Check branches
SELECT * FROM branches;

-- Check organization members
SELECT * FROM organization_members;

-- Check branch permissions
SELECT * FROM branch_permissions;
```

---

## Remaining Dummy Data Dependencies

These pages still use dummy data (to be migrated in future phases):

| Page | Dummy Data Used | Migration Notes |
|------|-----------------|-----------------|
| `dashboard/page.tsx` | `dummyDashboardStats`, `dummyOrders` | Create `/api/dashboard/stats` |
| `dashboard/staff/page.tsx` | `dummyUsers`, `dummyBranches` | Create `/api/staff` hook |
| `dashboard/branches/page.tsx` | `dummyBranches`, `dummyBranchStats` | Create `/api/branches` hook |
| `dashboard/reports/page.tsx` | Uses static data | Create reporting API |
| `dashboard/billing/page.tsx` | Uses static data | Integrate with Mayar |

---

## Next Steps (Phase 4)

1. **Create Dashboard Stats API** - `/api/dashboard/stats`
2. **Create Branches Hook** - `useBranches()` with CRUD
3. **Create Staff Hook** - `useStaff()` for managing employees
4. **Integrate Payment Gateway** - Mayar QRIS/VA integration
5. **WhatsApp Notification** - Send order notifications

---

## Completed Tasks

- [x] Create API `/api/user/permissions`
- [x] Update AuthContext to fetch from API
- [x] Update POS page to use `useServices` hook
- [x] Update POS page to use `useOrders` hook for checkout
- [x] Move `formatCurrency`/`formatDate` to utils.ts
- [x] Create Onboarding API `/api/onboarding/initialize`
- [x] Update AuthContext with auto-onboarding
- [x] Create this documentation
