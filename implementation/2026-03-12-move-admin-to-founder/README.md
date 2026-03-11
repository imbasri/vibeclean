# Move Admin to Founder Dashboard

## Overview

Memindahkan semua konten dari folder `(admin)` ke `(founder)` untuk menyatukan dashboard founder dan menghindari kebingungan antara user admin dan founder.

---

## Changes

### 1. Files Moved

| From | To | Status |
|------|-----|--------|
| `(admin)/admin/page.tsx` | Already in founder dashboard | Merged |
| `(admin)/admin/organizations/[id]/page.tsx` | `(founder)/founder/dashboard/organizations/[id]/page.tsx` | ✅ Moved |

### 2. Files Deleted

- `src/app/(admin)/` - Entire folder deleted

### 3. API Routes (Already Updated)

Semua API routes di `/api/admin/` sudah support founder access via `checkAdminAccess()` function.

---

## Struktur Final Founder Dashboard

```
/founder/login
/founder/dashboard
/founder/dashboard/organizations
/founder/dashboard/organizations/[id]
/founder/dashboard/revenue
/founder/dashboard/subscriptions
/founder/dashboard/transaction-fee
/founder/dashboard/withdrawals
/founder/settings
```

---

## Reason

- **Avoid confusion**: Tidak ada lagi route `/admin` yang membingungkan
- **Single source**: Semua dashboard founder di satu tempat
- **Security**: Middleware sudah menangani redirect dari `/admin` ke `/founder/dashboard`

---

## Testing

1. Login ke `/founder/login`
2. Akses `/founder/dashboard` - should show overview
3. Klik organization - should show detail page
4. Semua menu di sidebar harus berfungsi

---

*Created: 2026-03-12*
