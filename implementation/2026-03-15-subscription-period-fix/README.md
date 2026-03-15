# Subscription Period Calculation Fix

**Tanggal:** 2026-03-15  
**Status:** ✅ Completed  
**Author:** VibeClean Dev Team

---

## 🐛 Masalah

### Deskripsi
User sudah membayar subscription **2x atau lebih** (untuk beberapa bulan), tapi:
- **Periode subscription tidak bertambah** - masih hanya 1 bulan
- **Perpanjangan berikutnya tidak nambah** sesuai jumlah bulan yang dibayar
- Invoice history tidak menampilkan **periode billing**

### Contoh Kasus

```
User bayar Pro Plan:
- 12 Maret 2026: Bayar bulan 1 (periode: 12 Mar - 12 Apr)
- 14 Maret 2026: Bayar bulan 2 (seharusnya: 12 Apr - 12 Mei)

❌ SEBELUM FIX:
   Subscription end: 14 April 2026 (hanya +1 bulan dari sekarang)
   
✅ SESUDAH FIX:
   Subscription end: 12 Mei 2026 (+2 bulan dari periode awal)
```

### Root Cause

**Webhook selalu menimpa `currentPeriodEnd` dengan +1 bulan dari sekarang:**

```typescript
// ❌ SALAH: Selalu mulai dari sekarang
const currentPeriodStart = new Date(); // Hari ini
const currentPeriodEnd = new Date();
currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // +1 bulan

// Masalah: Jika sudah ada subscription aktif, periode ditimpa!
// Tidak ada penambahan bulan dari periode yang sudah ada
```

**Dampak:**
- Bayar 2x dalam 1 bulan = tetap 1 bulan
- Bayar 5x = tetap 1 bulan
- Periode tidak extend dari existing subscription

---

## ✅ Solusi

### 1. Fix Webhook - Extend Subscription Period

**File:** `src/app/api/webhooks/mayar/route.ts`

**Perubahan:**

```typescript
// BEFORE (❌ Wrong - Always overwrite)
const currentPeriodStart = new Date(); // Today
const currentPeriodEnd = new Date();
currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

// AFTER (✅ Correct - Extend if already active)
const now = new Date();
const currentPeriodStart = now;
const currentPeriodEnd = new Date();

// Check if subscription is already active and has a future period end
const existingPeriodEnd = subscription.currentPeriodEnd 
  ? new Date(subscription.currentPeriodEnd) 
  : null;

const isAlreadyActive = subscription.status === "active" && 
                        existingPeriodEnd && 
                        existingPeriodEnd > now;

if (isAlreadyActive) {
  // Extend from existing period end (NOT from now!)
  currentPeriodStart.setTime(existingPeriodEnd.getTime());
  currentPeriodEnd.setTime(existingPeriodEnd.getTime());
}

// Add billing cycle to period end
if (updatedBillingCycle === "yearly") {
  currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
} else {
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
}

console.log(`[Mayar Webhook] Subscription period: ${currentPeriodStart.toISOString()} to ${currentPeriodEnd.toISOString()}`);
console.log(`[Mayar Webhook] Is already active: ${isAlreadyActive}`);
```

### Flow Diagram

```
┌─────────────────────┐
│  User Pays Invoice  │
│  (2nd time this mo) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│  Webhook: payment.received  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Check Subscription     │
│  - Status: active?      │
│  - Period End: future?  │
└──────────┬──────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌──────────┐
│  NEW    │ │  ACTIVE  │
│  User   │ │  User    │
└────┬────┘ └────┬─────┘
     │           │
     │           ▼
     │     ┌─────────────────┐
     │     │ Extend from     │
     │     │ existing end    │
     │     │ (Apr 12 → May 12)│
     │     └────────┬────────┘
     │              │
     ▼              ▼
┌────────────────────────────┐
│  Start from today          │
│  (Mar 14 → Apr 14)         │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  Update subscription       │
│  currentPeriodEnd          │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  User sees correct period  │
│  "Perpanjangan: 12 Mei"    │
└────────────────────────────┘
```

### 2. Display Billing Period in Invoice Table

**File:** `src/app/(dashboard)/dashboard/billing/page.tsx`

**Perubahan:**

```tsx
// BEFORE: Only show invoice date
<TableHead>Tanggal</TableHead>
<TableCell>{formatDate(new Date(invoice.date))}</TableCell>

// AFTER: Show billing period
<TableHead>Periode Billing</TableHead>
<TableCell>
  <div className="flex flex-col">
    <span className="text-sm">
      {invoice.periodStart ? formatDate(new Date(invoice.periodStart)) : '-'}
    </span>
    <span className="text-xs text-muted-foreground">
      s/d {invoice.periodEnd ? formatDate(new Date(invoice.periodEnd)) : '-'}
    </span>
  </div>
</TableCell>
```

### 3. Update API Response

**File:** `src/app/api/billing/route.ts`

```typescript
const dbInvoices = await db
  .select({
    // ... existing fields ...
    billingCycle: subscriptionInvoices.billingCycle,
    periodStart: subscriptionInvoices.periodStart,
    periodEnd: subscriptionInvoices.periodEnd,
    paidAt: subscriptionInvoices.paidAt,
  })
  .from(subscriptionInvoices)
  .where(eq(subscriptionInvoices.organizationId, organizationId))
  .orderBy(desc(subscriptionInvoices.paidAt)) // Sort by paid date
  .limit(10);
```

### 4. Update Type Definition

**File:** `src/hooks/use-billing.ts`

```typescript
export interface BillingInvoice {
  id: string;
  invoiceNumber?: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  plan: string;
  billingCycle?: string;      // NEW
  periodStart?: string;       // NEW
  periodEnd?: string;         // NEW
  paidAt?: string;            // NEW
  paymentUrl?: string;
}
```

### 5. Data Recovery Script

Script untuk memperbaiki subscription yang sudah ada:

```javascript
// For each organization with multiple paid invoices:
// 1. Get first period start (earliest invoice)
// 2. Count total paid invoices (N months)
// 3. Calculate expected end: first_start + N months
// 4. Update subscription with correct period

const firstStart = new Date(org.first_period_start);
const expectedPeriodEnd = new Date(firstStart);
expectedPeriodEnd.setMonth(expectedPeriodEnd.getMonth() + org.paid_count);

UPDATE subscriptions
SET 
  current_period_start = firstStart,
  current_period_end = expectedPeriodEnd,
  status = 'active'
WHERE id = subscription.id;
```

---

## 📊 Hasil

### Sebelum Fix

```
User bayar 5x invoice Pro Plan:
- 12 Mar: Invoice 1 (period: 12 Mar - 12 Apr)
- 12 Mar: Invoice 2 (period: 12 Mar - 12 Apr)
- 12 Mar: Invoice 3 (period: 12 Mar - 12 Apr)
- 13 Mar: Invoice 4 (period: 13 Mar - 13 Apr)
- 14 Mar: Invoice 5 (period: 14 Mar - 14 Apr)

❌ Subscription End: 14 April 2026
❌ Total: Hanya 1 bulan!
❌ User rugi 4 bulan pembayaran
```

### Sesudah Fix

```
User bayar 5x invoice Pro Plan:
- 12 Mar: Invoice 1 (period: 12 Mar - 12 Apr)
- 12 Mar: Invoice 2 (period: 12 Apr - 12 May) ← Extend!
- 12 Mar: Invoice 3 (period: 12 May - 12 Jun) ← Extend!
- 13 Mar: Invoice 4 (period: 12 Jun - 12 Jul) ← Extend!
- 14 Mar: Invoice 5 (period: 12 Jul - 12 Aug) ← Extend!

✅ Subscription End: 12 Agustus 2026
✅ Total: 5 bulan!
✅ User dapat sesuai yang dibayar
```

### Invoice Table Display

**BEFORE:**
```
| No. Invoice | Tanggal  | Paket | Jumlah    | Status |
|-------------|----------|-------|-----------|--------|
| INV-001     | 14 Mar   | Pro   | 149.000   | Lunas  |
```

**AFTER:**
```
| No. Invoice | Periode Billing        | Paket | Jumlah    | Status |
|-------------|------------------------|-------|-----------|--------|
| INV-001     | 14 Mar                 | Pro   | 149.000   | Lunas  |
|             | s/d 14 Apr             |       |           |        |
| INV-002     | 14 Apr                 | Pro   | 149.000   | Lunas  |
|             | s/d 14 Mei             |       |           |        |
```

---

## 📁 Files Changed

| File | Type | Changes |
|------|------|---------|
| `src/app/api/webhooks/mayar/route.ts` | MODIFIED | Extend subscription period from existing end |
| `src/app/api/billing/route.ts` | MODIFIED | Return billing period fields |
| `src/hooks/use-billing.ts` | MODIFIED | Add period fields to BillingInvoice type |
| `src/app/(dashboard)/dashboard/billing/page.tsx` | MODIFIED | Display billing period in table |

---

## 🧪 Testing

### 1. Test New Payment (First Time)

```bash
# Pay first invoice
POST /api/billing/subscribe { plan: "pro" }
→ Mayar payment success
→ Webhook received

# Check subscription
SELECT current_period_start, current_period_end 
FROM subscriptions 
WHERE organization_id = 'org-123';

# Expected:
# current_period_start: 2026-03-15
# current_period_end: 2026-04-15 (+1 month)
```

### 2. Test Second Payment (Extend)

```bash
# Pay second invoice (within same month)
POST /api/billing/subscribe { plan: "pro" }
→ Mayar payment success
→ Webhook received

# Check subscription
SELECT current_period_start, current_period_end 
FROM subscriptions 
WHERE organization_id = 'org-123';

# Expected:
# current_period_start: 2026-04-15 (from previous end)
# current_period_end: 2026-05-15 (+1 month from previous end)
```

### 3. Test Multiple Payments

```bash
# Pay 5 invoices in a row
# Expected: subscription extended by 5 months
# First period: Mar 15 - Apr 15
# Final period: Mar 15 - Aug 15 (5 months total)
```

### 4. Test Billing Page Display

```
1. Go to /dashboard/billing
2. Check "Riwayat Invoice" table
3. Verify each invoice shows:
   - Period start date
   - Period end date
   - "s/d" between dates
```

---

## 🎯 Benefits

### Before Fix

❌ **Subscription period tidak extend**  
❌ **User kehilangan bulan yang sudah dibayar**  
❌ **Tidak ada visibility periode billing**  
❌ **Invoice table tidak informatif**  

### After Fix

✅ **Subscription period extend dengan benar**  
✅ **User dapat sesuai yang dibayar (N bulan)**  
✅ **Visibility penuh periode billing**  
✅ **Invoice table menampilkan periode**  
✅ **Accurate billing tracking**  

---

## 📝 Recovery Steps

Untuk user yang sudah terdampak:

```bash
# 1. Run recovery script
node fix-subscription-periods.js

# 2. Verify results
# - Check organizations with multiple payments
# - Verify subscription periods are extended
# - Confirm total months = total invoices paid

# 3. Manual verification
SELECT 
  o.name,
  COUNT(si.id) as paid_invoices,
  MIN(si.period_start) as first_period,
  MAX(si.period_end) as expected_end,
  s.current_period_end as actual_end
FROM organizations o
JOIN subscription_invoices si ON o.id = si.organization_id
JOIN subscriptions s ON o.id = s.organization_id
WHERE si.status = 'paid'
GROUP BY o.id, s.current_period_end;
```

---

## 🔗 References

- [Subscription System](./2026-03-15-member-subscription-system/README.md)
- [Webhook Handling](./2026-03-15-subscription-invoice-calculation/README.md)
- [Billing API](../README.md#billing--subscription)

---

## 📋 Next Steps

- [ ] Add subscription period calculator in admin dashboard
- [ ] Send email notification before subscription expires
- [ ] Add auto-renewal reminder (H-3, H-1)
- [ ] Implement proration for plan upgrades mid-cycle
- [ ] Add subscription analytics (MRR, churn rate, etc.)
