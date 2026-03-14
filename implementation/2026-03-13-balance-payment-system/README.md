# Implementation: Balance & Payment System

## Date: 2026-03-13

## Overview

This document describes the balance and payment system implementation for VibeClean.

## Payment Flow

### QRIS/Transfer Payment
1. Customer scans QR Code at branch → `/pay/{orgSlug}/{branchId}`
2. Customer enters amount → Creates order in DB
3. Mayar generates QRIS payment
4. Customer scans & pays via QRIS
5. Mayar webhook fires → `/api/webhooks/mayar`
6. System updates order to "paid" and adds balance to owner

### Cash Payment
1. Customer pays cash at counter
2. Kasir marks order as "Lunas" (paid) in POS
3. Order recorded as "cash" payment method
4. No balance added (money already with owner)

## Balance System

### Tables

```typescript
// organization_balances - tracks owner earnings
{
  totalEarnings: decimal,      // Total gross earnings
  availableBalance: decimal,   // Available for withdrawal
  pendingBalance: decimal,     // Pending (unpaid orders)
  totalWithdrawn: decimal      // Total withdrawn
}

// balance_transactions - transaction history
{
  type: "payment_received" | "fee_deducted" | "withdrawal" | "refund" | "adjustment",
  status: "pending" | "completed" | "failed" | "cancelled",
  amount: decimal,              // Gross amount
  feeAmount: decimal,          // Transaction fee (founder's cut)
  netAmount: decimal           // Net amount (after fee)
}
```

### Transaction Fee

- Starter plan: Rp 2.000 per transaction
- Pro plan: Rp 500 per transaction
- This is the founder's revenue

## Withdrawal Logic

### Current Implementation
- Owner can request withdrawal from available balance
- Balance is deducted immediately upon request
- Transaction is recorded with type "withdrawal"

### Cash vs Transfer Differentiation

| Payment Method | Balance Added? | Can Withdraw? |
|----------------|----------------|----------------|
| qris/transfer/ewallet | Yes (gross - fee) | Yes |
| cash | No | No (already with owner) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/balance` | GET | Get owner balance & transactions |
| `/api/balance/withdraw` | POST | Request withdrawal |
| `/api/payments/public/create` | POST | Create public payment (QRIS) |
| `/api/webhooks/mayar` | POST | Handle payment callbacks |

## Files Modified

- `src/lib/db/schema.ts` - Added balance tables
- `src/app/api/balance/route.ts` - Balance API
- `src/app/api/balance/withdraw/route.ts` - Withdrawal API
- `src/app/api/payments/public/create/route.ts` - Payment creation
- `src/app/api/webhooks/mayar/route.ts` - Webhook handler with balance update
- `src/hooks/use-balance.ts` - Balance hook
- `src/app/(dashboard)/dashboard/balance/page.tsx` - Balance page UI
- `src/components/layout/dashboard-layout.tsx` - Added navigation

## Future Enhancements

1. **Mayar Disbursement Integration** - When Mayar API available
2. **Auto-transfer** - Founder can auto-transfer to owner after WD request
3. **Cash balance tracking** - Track cash earnings separately for reference
