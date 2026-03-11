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
- Growth stats

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
├── transaction-fee/route.ts          ✅ DONE
├── withdrawals/route.ts               ✅ DONE
├── withdrawals/[id]/approve/route.ts ✅ DONE
├── withdrawals/[id]/reject/route.ts  ✅ DONE
├── addons/route.ts                   ⏳ Pending
└── settings/route.ts                 ⏳ Pending

src/app/(founder)/founder/dashboard/
├── transaction-fee/page.tsx          ✅ DONE
├── withdrawals/page.tsx               ✅ DONE
├── addons/page.tsx                   ⏳ Pending
└── settings/page.tsx                  ⏳ Pending
```

---

## 4. Implementation Order

1. **Transaction Fee** - ✅ DONE
2. **Withdrawals** - ✅ DONE
3. **Settings** - ⏳ Next
4. **Add-ons** - ⏳ Pending

---

## 5. Acceptance Criteria

- [x] Transaction Fee: View total, monthly, growth stats
- [x] Withdrawals: List, approve, reject
- [ ] Settings: View & edit platform config
- [ ] Add-ons: List active, revenue summary

---

## 6. Next Steps

1. Deploy ke Heroku
2. Test Transaction Fee page
3. Test Withdrawals page
4. Lanjut ke Settings & Add-ons

---

*Created: 2026-03-12*
*Updated: 2026-03-12*
*Based on: AGENTS.md Business PRD*
