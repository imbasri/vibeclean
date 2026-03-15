# Mayar Webhook Setup Guide

**Problem:** User sudah bayar QRIS, tapi order status tidak berubah jadi "paid"

---

## 🔍 **Root Cause**

Ada **2 URL yang berbeda** di Mayar:

### 1. **Redirect URL** (User Flow)
```
https://www.imbasri.dev/payment/success?orderId=xxx
```
- User diarahkan kesini **setelah** bayar
- Hanya untuk **display success page**
- **TIDAK** mengubah status order

### 2. **Webhook URL** (Backend Flow) ✅
```
https://www.imbasri.dev/api/webhooks/mayar
```
- Mayar mengirim **server-to-server notification**
- **INI yang mengubah status order jadi "paid"**
- Diproses otomatis di backend

---

## ✅ **Solusi: Setup Webhook di Mayar Dashboard**

### Step 1: Login ke Mayar Dashboard

1. Go to: https://app.mayar.id (Production) atau https://sandbox-app.mayar.id (Sandbox)
2. Login dengan akun Mayar Anda

### Step 2: Navigate ke Webhook Settings

**Production:**
```
Settings → API & Webhooks → Webhook URL
```

**Sandbox:**
```
Settings → API & Webhooks → Webhook URL
```

### Step 3: Set Webhook URL

**Production URL:**
```
https://www.imbasri.dev/api/webhooks/mayar
```

**Sandbox URL (Testing):**
```
https://your-dev-url.ngrok.io/api/webhooks/mayar
```

### Step 4: Select Events

Centang events berikut:
- ✅ `payment.received`
- ✅ `payment.success`
- ✅ `invoice.paid`

### Step 5: Save & Test

1. Click **Save**
2. Click **Test Webhook** (jika ada)
3. Mayar akan kirim test payload ke URL Anda

---

## 🧪 **Testing Webhook Locally**

Karena localhost tidak bisa diakses Mayar, gunakan **ngrok**:

### 1. Install ngrok

```bash
# Windows
choco install ngrok

# Mac
brew install ngrok

# Linux
snap install ngrok
```

### 2. Start ngrok

```bash
ngrok http 3000
```

Output:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### 3. Update .env.local

```env
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### 4. Set Webhook URL di Mayar Sandbox

```
https://abc123.ngrok.io/api/webhooks/mayar
```

### 5. Test Payment Flow

1. Create order di local
2. Bayar via QRIS Sandbox
3. Check console logs:
   ```
   [Mayar Webhook] Event: payment.received
   [Mayar Webhook] Order ORD-xxx marked as PAID
   ```

---

## 🔍 **Debugging Webhook Issues**

### 1. Check Webhook Logs

**Heroku:**
```bash
heroku logs --tail | grep "Mayar Webhook"
```

**Local:**
```bash
# Terminal where npm run dev is running
# Look for: [Mayar Webhook] ...
```

### 2. Verify Webhook Signature

Webhook handler sudah include signature verification:

```typescript
if (process.env.MAYAR_WEBHOOK_SECRET) {
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
}
```

### 3. Check Database

```sql
-- Check order status
SELECT 
  order_number, 
  payment_status, 
  paid_at,
  mayar_transaction_id
FROM orders
WHERE mayar_transaction_id = 'txn-from-mayar';

-- Expected: payment_status = 'paid'
```

### 4. Manual Webhook Test

Test webhook manually dengan curl:

```bash
curl -X POST https://www.imbasri.dev/api/webhooks/mayar \
  -H "Content-Type: application/json" \
  -H "x-mayar-signature: test" \
  -d '{
    "event": "payment.received",
    "data": {
      "transactionId": "test-123",
      "status": "SUCCESS",
      "amount": 149000,
      "extraData": {
        "orderId": "970dc512-872c-4095-98bb-ef1011b9a4c1"
      }
    }
  }'
```

Check logs:
```
[Mayar Webhook] Event: payment.received
[Mayar Webhook] Order marked as PAID
```

---

## 📊 **Webhook Flow Diagram**

```
┌─────────────┐
│   User      │
│   Scan QRIS │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Mayar Payment Page    │
│   User completes payment│
└──────┬──────────────────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌─────────────────────┐            ┌──────────────────────┐
│ Redirect (User)     │            │ Webhook (Backend)    │
│                     │            │                      │
│ /payment/success    │            │ POST /api/webhooks/  │
│ ?orderId=xxx        │            │ mayar                │
│                     │            │                      │
│ Show success page   │            │ Update order status  │
│ (NO DB changes)     │            │ to PAID              │
└─────────────────────┘            └──────────────────────┘
```

---

## ⚠️ **Common Issues**

### Issue 1: Webhook Tidak Diterima

**Symptom:** Order status tidak berubah jadi "paid"

**Cause:** Webhook URL belum di-set di Mayar dashboard

**Fix:**
1. Login ke Mayar dashboard
2. Settings → Webhook URL
3. Set: `https://www.imbasri.dev/api/webhooks/mayar`
4. Save

### Issue 2: Invalid Signature

**Symptom:** Logs show "Invalid webhook signature"

**Cause:** `MAYAR_WEBHOOK_SECRET` tidak match

**Fix:**
1. Copy webhook secret dari Mayar dashboard
2. Paste ke `.env.local` / production env:
   ```env
   MAYAR_WEBHOOK_SECRET=<secret-from-mayar>
   ```
3. Restart server

### Issue 3: Order Not Found

**Symptom:** Logs show "Order not found for transaction xxx"

**Cause:** `extraData.orderId` tidak ada atau salah format

**Fix:** Check payment creation code:
```typescript
extraData: {
  orderId: newOrder.id, // ← Must be UUID
  orderNumber,
  organizationId: organization.id,
}
```

### Issue 4: Localhost Tidak Bisa Diakses

**Symptom:** Webhook tidak sampai ke local dev server

**Cause:** Mayar tidak bisa akses localhost

**Fix:** Gunakan ngrok (lihat section "Testing Webhook Locally")

---

## 🎯 **Verification Checklist**

- [ ] Webhook URL di-set di Mayar dashboard
- [ ] Webhook URL: `https://www.imbasri.dev/api/webhooks/mayar`
- [ ] Events selected: `payment.received`, `payment.success`
- [ ] `MAYAR_WEBHOOK_SECRET` configured in .env
- [ ] Webhook logs show: `[Mayar Webhook] Event: payment.received`
- [ ] Order status changes to "paid" in database
- [ ] User balance updated correctly
- [ ] Transaction fee calculated

---

## 📝 **Production Deployment**

### Heroku Setup

1. **Set environment variables:**
   ```bash
   heroku config:set MAYAR_WEBHOOK_SECRET=<secret>
   heroku config:set MAYAR_API_KEY=<key>
   heroku config:set MAYAR_ENV=production
   ```

2. **Verify webhook URL is accessible:**
   ```bash
   curl https://www.imbasri.dev/api/webhooks/mayar
   # Should return: {"status": "ok"}
   ```

3. **Test with real payment:**
   - Create order
   - Pay via QRIS
   - Check Heroku logs:
     ```bash
     heroku logs --tail
     ```

---

## 🔗 **References**

- [Mayar Webhook Documentation](https://docs.mayar.id/webhooks)
- [Mayar API Documentation](https://docs.mayar.id)
- [VibeClean Webhook Handler](../src/app/api/webhooks/mayar/route.ts)

---

**Last Updated:** 2026-03-15  
**Status:** Ready for Production ✅
