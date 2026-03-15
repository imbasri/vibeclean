# Subscription Invoice Calculation Fix

**Tanggal:** 2026-03-15  
**Status:** ✅ Completed  
**Author:** VibeClean Dev Team

---

## 🐛 Masalah

### Deskripsi
User telah melakukan pembayaran subscription sebanyak 2x dan invoice berhasil dibuat, namun:
1. Subscription plan tidak terupdate dari "starter" ke "pro"
2. Invoice count tidak terlihat di dashboard
3. Data subscription tetap menunjukkan plan "starter" dengan price Rp 0

### Root Cause

**Webhook tidak mengupdate subscription plan dari invoice yang dibayar:**

1. **Di `/api/billing/subscribe`:**
   - User membuat subscription Pro → invoice dibuat dengan benar
   - Data `plan` dan `billingCycle` dikirim ke Mayar via `extraData`
   - Invoice record dibuat di `subscription_invoices` dengan status "pending"

2. **Di `/api/webhooks/mayar`:**
   - Webhook menerima pembayaran SUCCESS
   - Webhook TIDAK mengambil data `plan` dari invoice
   - Webhook hanya mengupdate status ke "active" tanpa mengubah plan
   - Subscription tetap di plan "starter" (default)

3. **Di Database:**
   - 7 invoice PAID untuk 3 organisasi berbeda
   - Semua subscriptions masih "starter" dengan price Rp 0
   - Data invoice dan subscription tidak sinkron

---

## ✅ Solusi

### 1. Fix Webhook Handler (`/api/webhooks/mayar`)

**File:** `src/app/api/webhooks/mayar/route.ts`

**Perubahan:**

```typescript
async function handleSubscriptionPaymentReceived(data: MayarWebhookData["data"]) {
  // ... existing code ...

  // NEW: Extract plan and billingCycle from custom_field and extraData
  let plan: string | null = null;
  let billingCycle: string | null = null;

  if (data.custom_field) {
    const planField = data.custom_field.find(f => f.key === "plan");
    if (planField) plan = String(planField.value);

    const billingCycleField = data.custom_field.find(
      f => f.key === "billingCycle" || f.key === "billing_cycle"
    );
    if (billingCycleField) billingCycle = String(billingCycleField.value);
  }

  if (data.extraData) {
    plan = plan || data.extraData.plan || null;
    billingCycle = billingCycle || 
                   data.extraData.billingCycle || 
                   data.extraData.billing_cycle || 
                   null;
  }

  // NEW: Use plan from invoice if available
  const updatedPlan = plan || subscription.plan;
  const updatedBillingCycle = billingCycle || subscription.billingCycle || "monthly";

  // NEW: Calculate period based on billing cycle
  const currentPeriodEnd = new Date();
  if (updatedBillingCycle === "yearly") {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  await db.transaction(async (tx) => {
    // Update subscription with correct plan
    await tx
      .update(subscriptions)
      .set({
        status: "active",
        plan: updatedPlan,        // ← UPDATED: Now updates plan
        billingCycle: updatedBillingCycle,  // ← UPDATED: Now updates billing cycle
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    // Create invoice with correct plan
    await tx.insert(subscriptionInvoices).values({
      // ... existing fields ...
      plan: updatedPlan,          // ← UPDATED: Uses invoice plan
      billingCycle: updatedBillingCycle,  // ← UPDATED: Uses invoice billing cycle
      // ...
    });

    // Update organization plan
    await tx
      .update(organizations)
      .set({
        plan: updatedPlan,        // ← UPDATED: Updates org plan
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, subscription.organizationId));
  });
}
```

### 2. Fix Subscribe Endpoint (`/api/billing/subscribe`)

**File:** `src/app/api/billing/subscribe/route.ts`

**Perubahan:**

```typescript
const invoice = await createInvoice({
  // ... existing fields ...
  extraData: {
    organizationId: organization.id,
    subscriptionId: subscriptionRecord.id,
    plan,              // ← Already sent
    billingCycle,      // ← Already sent
    invoiceNumber,
  },
  // NEW: Also send in custom_field for better webhook compatibility
  customField: [
    { key: "organization_id", value: organization.id },
    { key: "subscription_id", value: subscriptionRecord.id },
    { key: "plan", value: plan },           // ← NEW
    { key: "billingCycle", value: billingCycle },  // ← NEW
    { key: "invoiceNumber", value: invoiceNumber },
  ],
});
```

### 3. Data Recovery Script

**File:** `fix-subscriptions.js`

Script untuk memperbaiki data subscription yang sudah ada:

```javascript
// For each organization with paid invoices:
// 1. Get latest paid invoice
// 2. Update subscription plan to match invoice
// 3. Update organization plan
// 4. Set correct billing period

UPDATE subscriptions
SET 
  plan = invoice.plan,
  billing_cycle = invoice.billing_cycle,
  status = 'active',
  price = invoice.amount,
  current_period_start = invoice.paid_at,
  current_period_end = (invoice.billing_cycle === 'yearly' 
    ? paid_at + 1 year 
    : paid_at + 1 month)
WHERE id = invoice.subscription_id;
```

**Hasil:**
- 3 organizations checked
- 3 subscriptions updated to "pro" plan
- Semua subscription sekarang sinkron dengan invoice

---

## 📊 Hasil

### Sebelum Fix

```
=== SUBSCRIPTIONS ===
Total: 4

[Subscription 1]
  Plan: starter          ← WRONG (should be "pro")
  Status: active
  Price: 0.00           ← WRONG (should be 149000)

[Subscription 2]
  Plan: starter          ← WRONG
  Status: active
  Price: 0.00           ← WRONG
```

### Setelah Fix

```
=== SUBSCRIPTIONS ===
Total: 4

[Subscription 1]
  Plan: pro             ← CORRECT ✅
  Status: active
  Price: 149000.00      ← CORRECT ✅
  Billing Cycle: monthly
  Period: 2026-03-14 to 2026-04-14

[Subscription 2]
  Plan: pro             ← CORRECT ✅
  Status: active
  Price: 149000.00      ← CORRECT ✅
```

---

## 🧪 Testing

### Manual Testing

1. **Create new Pro subscription:**
   ```bash
   curl -X POST http://localhost:3000/api/billing/subscribe \
     -H "Content-Type: application/json" \
     -d '{"plan": "pro", "billingCycle": "monthly"}'
   ```

2. **Simulate webhook payment:**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/mayar \
     -H "Content-Type: application/json" \
     -d '{
       "event": "payment.received",
       "data": {
         "transactionId": "test-123",
         "status": "SUCCESS",
         "amount": 149000,
         "custom_field": [
           {"key": "organization_id", "value": "org-123"},
           {"key": "subscription_id", "value": "sub-123"},
           {"key": "plan", "value": "pro"},
           {"key": "billingCycle", "value": "monthly"}
         ]
       }
     }'
   ```

3. **Verify subscription updated:**
   ```sql
   SELECT plan, status, price, billing_cycle 
   FROM subscriptions 
   WHERE id = 'sub-123';
   ```

   Expected:
   ```
   plan: pro
   status: active
   price: 149000.00
   billing_cycle: monthly
   ```

---

## 📝 Files Changed

| File | Changes |
|------|---------|
| `src/app/api/webhooks/mayar/route.ts` | Enhanced `handleSubscriptionPaymentReceived` to extract and use `plan` & `billingCycle` from invoice data |
| `src/app/api/billing/subscribe/route.ts` | Added `customField` to Mayar invoice creation for better webhook compatibility |
| `fix-subscriptions.js` | Created script to fix existing subscription data |
| `check-subscriptions.js` | Created script to verify subscription data |

---

## 🎯 Next Steps

1. **Monitoring:**
   - Pantau webhook logs untuk pembayaran baru
   - Pastikan semua subscription baru terupdate dengan benar

2. **Dashboard Enhancement:**
   - [ ] Tampilkan invoice count di founder dashboard
   - [ ] Tampilkan total revenue per organization
   - [ ] Add invoice history di organization detail page

3. **Documentation:**
   - [ ] Update webhook documentation
   - [ ] Add troubleshooting guide untuk subscription issues

---

## 🔗 Related Issues

- Invoice count tidak muncul di dashboard founder
- Subscription plan tidak sinkron dengan invoice
- Revenue calculation tidak akurat

---

## 📚 References

- [Mayar Webhook Documentation](./WEBHOOK_SETUP.md)
- [Subscription System Implementation](./implementation/2026-03-15-member-subscription-system/README.md)
- [Billing API Documentation](./README.md#billing--subscription)
