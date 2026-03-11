# Founder Dashboard Enhancement Plan

## Overview

Berdasarkan **AGENTS.md (Business PRD)**, plan ini meningkatkan Founder Dashboard dengan fitur-fitur yang sesuai kebutuhan bisnis VibeClean.

---

## 1. Database Schema yang Sudah Ada

| Table | Status |
|-------|--------|
| `withdrawals` | ✅ Ada |
| `orders.transaction_fee` | ✅ Ada |
| `platform_settings` | ✅ Ada |
| `addon_products` & `addon_purchases` | ✅ Ada |

---

## 2. Fitur yang Akan Ditambahkan

### 2.1 Transaction Fee Monitoring (HIGH PRIORITY)
- Total fee terkumpul
- Fee bulan ini
- Breakdown per organisasi

### 2.2 Withdrawals Management (HIGH PRIORITY)
- Tabel semua withdrawal request
- Filter status
- Approve/Reject functionality

### 2.3 Platform Settings (MEDIUM)
- Konfigurasi transaction fee rate
- View pricing plans

### 2.4 Add-ons Management (MEDIUM)
- Daftar add-ons aktif
- Revenue summary

---

## 3. Struktur File Baru

```
src/app/api/founder/
├── transaction-fee/route.ts
├── withdrawals/route.ts
├── withdrawals/[id]/approve/route.ts
├── withdrawals/[id]/reject/route.ts
├── addons/route.ts
└── settings/route.ts

src/app/(founder)/founder/dashboard/
├── transaction-fee/page.tsx   (NEW)
├── withdrawals/page.tsx        (NEW)
├── addons/page.tsx            (NEW)
└── settings/page.tsx          (NEW)
```

---

## 4. Implementation Order

1. **Transaction Fee** - Start here (easiest)
2. **Withdrawals** - Core business feature
3. **Settings** - Simple UI
4. **Add-ons** - Business feature

---

## 5. Acceptance Criteria

- [ ] Transaction Fee: View total, monthly, breakdown
- [ ] Withdrawals: List, approve, reject
- [ ] Settings: View & edit platform config
- [ ] Add-ons: List active, revenue summary

---

*Created: 2026-03-12*
*Based on: AGENTS.md Business PRD*
