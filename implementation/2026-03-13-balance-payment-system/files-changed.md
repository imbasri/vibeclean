# Files Changed - Balance & Payment System

## Date: 2026-03-13

## New Files Created

### Core Files
- `src/hooks/use-balance.ts` - Balance hook with useBalance() and requestWithdrawal()
- `src/app/api/balance/route.ts` - GET balance and transactions
- `src/app/api/balance/withdraw/route.ts` - POST withdrawal request
- `src/app/(dashboard)/dashboard/balance/page.tsx` - Balance dashboard page

## Modified Files

### Schema (`src/lib/db/schema.ts`)
- Added `organizationBalances` table (lines 126-149)
- Added `balanceTransactions` table (lines 151-181)
- Added relations for both tables (lines 579-580, 682-698)

### API Routes
- `src/app/api/payments/public/create/route.ts` - Create order before payment
- `src/app/api/webhooks/mayar/route.ts` - Update balance on payment received

### UI Components
- `src/components/layout/dashboard-layout.tsx` - Added Wallet icon and "Saldo & Tarik Dana" nav

### Types
- `src/types/mayar.ts` - Added `extraData` to PaymentRequest

### Database
- `drizzle.config.ts` - Migration configuration

## Database Tables Created

```sql
-- organization_balances
CREATE TABLE organization_balances (
  id uuid PRIMARY KEY,
  organization_id uuid UNIQUE,
  total_earnings numeric(15,2) DEFAULT '0',
  available_balance numeric(15,2) DEFAULT '0',
  pending_balance numeric(15,2) DEFAULT '0',
  total_withdrawn numeric(15,2) DEFAULT '0',
  last_transaction_at timestamp,
  created_at timestamp,
  updated_at timestamp
);

-- balance_transactions
CREATE TABLE balance_transactions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  order_id uuid,
  type text NOT NULL,
  status text DEFAULT 'pending',
  amount numeric(15,2) NOT NULL,
  fee_amount numeric(15,2) DEFAULT '0',
  net_amount numeric(15,2) NOT NULL,
  description text,
  reference_id text,
  created_at timestamp,
  completed_at timestamp
);
```

## Build Status

✅ Build passes successfully
