# Mayar Webhook Setup Guide - VibeClean

**Last Updated**: 2026-03-15  
**Platform**: Mayar Payment Gateway  
**Webhook URL**: `https://www.imbasri.dev/api/webhooks/mayar`

---

## 🔔 Webhook Configuration

### Step 1: Configure Webhook in Mayar Dashboard

1. **Login to Mayar Dashboard**
   - Sandbox: https://sandbox-app.mayar.id
   - Production: https://app.mayar.id

2. **Navigate to Webhook Settings**
   - Go to: Settings → Webhooks
   - Or: https://app.mayar.id/settings/webhooks

3. **Add New Webhook**
   ```
   Webhook URL: https://www.imbasri.dev/api/webhooks/mayar
   Events: 
     ✅ payment.received
     ✅ payment.failed
     ✅ payment.reminder (optional)
   Secret Key: 2acb7d4adac93a497f7ceaece4a83286917105cb6878d8359d33ea93e243abbc21be2704d67c93e8cf9cf634e61b31591e5651a60e3c4d107af2f6faca263ab1
   ```

4. **Save Configuration**
   - Click "Save" or "Add Webhook"
   - Mayar will send a test webhook to verify

### Step 2: Verify Webhook Secret

Make sure `MAYAR_WEBHOOK_SECRET` is set in your environment:

```bash
# Heroku
heroku config:set MAYAR_WEBHOOK_SECRET=2acb7d4adac93a497f7ceaece4a83286917105cb6878d8359d33ea93e243abbc21be2704d67c93e8cf9cf634e61b31591e5651a60e3c4d107af2f6faca263ab1

# Verify
heroku config:get MAYAR_WEBHOOK_SECRET
```

### Step 3: Test Webhook

**Option 1: Trigger Test Payment**

1. Go to `/dashboard/billing`
2. Click "Upgrade to Pro"
3. Complete test payment
4. Check logs: `heroku logs --tail | grep "Mayar Webhook"`

**Option 2: Manual Webhook Test**

```bash
# Send test webhook to your production URL
curl -X POST https://www.imbasri.dev/api/webhooks/mayar \
  -H "Content-Type: application/json" \
  -H "x-mayar-signature: test" \
  -d '{
    "event": "payment.received",
    "data": {
      "id": "test-123",
      "transactionId": "test-tx-123",
      "status": "SUCCESS",
      "transactionStatus": "paid",
      "amount": 149000,
      "nettAmount": 141550,
      "paymentMethod": "QRIS",
      "extraData": {
        "organization_id": "your-org-id",
        "subscription_id": "your-subscription-id",
        "plan": "pro"
      }
    }
  }'
```

---

## 🔍 Debugging Webhook Issues

### Issue 1: Webhook Not Receiving Events

**Check Mayar Dashboard:**

```
1. Login to Mayar Dashboard
2. Go to Settings → Webhooks
3. Check webhook status (should be "Active")
4. Check "Last Triggered" timestamp
5. Check "Failed Attempts" count
```

**Check Heroku Logs:**

```bash
# Watch for webhook events
heroku logs --tail --app vibeclean-production | grep "Mayar Webhook"

# Check for errors
heroku logs --tail --app vibeclean-production | grep "Webhook" | grep "Error"
```

**Verify Webhook URL:**

```bash
# Test if webhook endpoint is accessible
curl -I https://www.imbasri.dev/api/webhooks/mayar

# Should return: HTTP/2 200 or 405 (Method Not Allowed for GET)
```

### Issue 2: Signature Verification Failed

**Error in logs:**
```
[Mayar Webhook] Invalid webhook signature
```

**Solution:**

1. Verify `MAYAR_WEBHOOK_SECRET` matches in Mayar dashboard
2. Check which header Mayar uses:
   ```bash
   heroku logs --tail | grep "x-mayar-signature"
   ```
3. Update signature header name in code if needed:
   ```typescript
   // src/app/api/webhooks/mayar/route.ts
   const signature =
     request.headers.get("x-mayar-signature") ||
     request.headers.get("x-webhook-signature") ||
     "";
   ```

### Issue 3: Subscription Not Activating

**Check webhook logs:**

```bash
heroku logs --tail | grep "Subscription"
```

**Expected log flow:**

```
[Mayar Webhook] Event: payment.received
[Mayar Webhook] Detected as subscription based on extraData
[Mayar Webhook] Found organization_id in extraData
[Mayar Webhook] Subscription 123 activated for org 456
```

**If subscription not found:**

Check if `extraData` contains correct IDs:

```sql
-- Check subscription exists
SELECT id, organization_id, plan, status 
FROM subscriptions 
WHERE organization_id = 'your-org-id';

-- Check invoice has correct data
SELECT id, invoice_number, mayar_transaction_id, status, plan
FROM subscription_invoices
WHERE mayar_transaction_id = 'mayar-tx-id';
```

---

## 📊 Webhook Payload Structure

### Payment Received (Subscription)

```json
{
  "event": "payment.received",
  "data": {
    "id": "pay_abc123",
    "transactionId": "tx_def456",
    "status": "SUCCESS",
    "transactionStatus": "paid",
    "amount": 149000,
    "nettAmount": 141550,
    "paymentMethod": "QRIS",
    "productName": "VibeClean Pro - Monthly",
    "extraData": {
      "organizationId": "org-uuid-here",
      "subscriptionId": "sub-uuid-here",
      "plan": "pro",
      "billingCycle": "monthly",
      "invoiceNumber": "INV-1234567890"
    },
    "custom_field": [
      {
        "key": "organization_id",
        "value": "org-uuid-here"
      },
      {
        "key": "subscription_id",
        "value": "sub-uuid-here"
      }
    ],
    "createdAt": "2026-03-15T10:00:00Z",
    "updatedAt": "2026-03-15T10:05:00Z"
  }
}
```

---

## ✅ Webhook Flow

### 1. User Initiates Subscription

```
User clicks "Upgrade to Pro"
  ↓
POST /api/billing/subscribe
  ↓
Create Mayar Invoice with extraData:
  - organizationId
  - subscriptionId
  - plan
  ↓
Return payment URL to user
```

### 2. User Completes Payment

```
User pays via QRIS/VA/E-Wallet
  ↓
Mayar processes payment
  ↓
Mayar sends webhook to:
  https://www.imbasri.dev/api/webhooks/mayar
```

### 3. Webhook Processing

```
POST /api/webhooks/mayar
  ↓
Verify signature
  ↓
Parse payload
  ↓
Detect payment type (subscription vs order)
  ↓
If subscription:
  - Update subscriptions.status = "active"
  - Update subscriptions.currentPeriodStart/End
  - Create subscription_invoices record
  - Update organizations.plan
  - Update organizations.subscriptionStatus
  ↓
Return 200 OK to Mayar
```

### 4. User Sees Updated Status

```
Frontend polls /api/billing
  ↓
Returns updated subscription:
  - plan: "pro"
  - status: "active"
  ↓
UI shows "Pro Plan - Active"
```

---

## 🧪 Testing Checklist

- [ ] Webhook URL configured in Mayar dashboard
- [ ] Webhook secret matches in .env
- [ ] Test payment completed successfully
- [ ] Webhook received (check logs)
- [ ] Subscription status updated to "active"
- [ ] Organization plan updated to "pro"
- [ ] Invoice created in database
- [ ] User sees updated plan in dashboard

---

## 🐛 Common Issues & Solutions

### Issue: "Invoice belum lunas"

**Cause**: Invoice status is still "pending"

**Solution**:
```sql
-- Check invoice status
SELECT id, invoice_number, status, mayar_transaction_id
FROM subscription_invoices
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 1;

-- If status is "pending" but payment completed, manually activate:
-- (Only if webhook failed but payment succeeded)
POST /api/billing/invoice/[id]/force-activate
```

### Issue: Plan Not Updating from Starter to Pro

**Cause**: Webhook not updating `organizations.plan`

**Solution**: Check webhook logs for errors:
```bash
heroku logs --tail | grep "organizations.plan"
```

If no logs found, webhook is not triggering the update. Check Mayar dashboard for webhook delivery status.

### Issue: Duplicate Invoices

**Cause**: Webhook triggered multiple times

**Solution**: Webhook already has deduplication logic:
```typescript
// Check if invoice already exists
const [existingInvoice] = await db
  .select()
  .from(subscriptionInvoices)
  .where(eq(subscriptionInvoices.mayarTransactionId, data.transactionId));

if (existingInvoice) {
  console.log("Invoice already exists, skipping");
  return;
}
```

---

## 📞 Support

If webhook issues persist:

1. **Check Mayar Status**: https://status.mayar.id
2. **Contact Mayar Support**: support@mayar.id
3. **Check Heroku Logs**: `heroku logs --tail`
4. **Verify Database**: `heroku pg:psql`

---

**Webhook Endpoint**: `https://www.imbasri.dev/api/webhooks/mayar`  
**Webhook Secret**: Configured in `.env.local`  
**Last Tested**: 2026-03-15
