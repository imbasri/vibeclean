# Payment API Fix - 2026-03-15

## Problem
The `/api/payments/public/create` endpoint was returning 500 errors when the POS tried to create QRIS payments. The error logs showed:
```
POST https://www.imbasri.dev/api/payments/public/create
[HTTP/2 500  1389ms]
```

## Root Cause
The validation schema required `branchId` as a mandatory field, but the `PaymentQRISDialog` component was sending `orderId` (the order ID) without `branchId`. This caused validation to fail.

## Solution

### 1. Updated Validation Schema (`src/app/api/payments/public/create/route.ts`)
- Made `branchId` optional
- Added refinement validation: either `orderId` OR `branchId` must be provided
- This allows the endpoint to handle two use cases:
  - **Regenerate payment**: `orderId` is provided (gets branch/org from existing order)
  - **Create new order**: `branchId` is provided (creates new order with payment)

### 2. Updated Branch/Organization Lookup Logic
- When `orderId` is provided:
  - Fetch the existing order
  - Get branch from `order.branchId`
  - Get organization from `branch.organizationId`
- When `branchId` is provided:
  - Get branch directly
  - Get organization from branch
- Validate both branch and organization exist before proceeding

### 3. Added Comprehensive Error Logging
Added detailed console logging throughout the payment flow:
- `[PublicPayment]` - Payment API endpoint logs
- `[Mayar]` - Mayar client logs
- Logs include request bodies, response statuses, and error details

## Files Modified

1. **`src/app/api/payments/public/create/route.ts`**
   - Updated `createPublicPaymentSchema` validation
   - Added logic to handle `orderId` without `branchId`
   - Enhanced error logging

2. **`src/lib/mayar.ts`**
   - Added logging to `mayarFetch` function
   - Added logging to `createOrderPayment` function
   - Enhanced error messages

## Testing

To test the fix:
1. Start the dev server: `npm run dev`
2. Go to POS page
3. Create an order with QRIS payment
4. The QRIS payment dialog should now show the QR code without errors

## Expected Log Output

When a payment is created successfully, you should see:
```
[PublicPayment] ========== START ==========
[PublicPayment] Checking Mayar configuration...
[PublicPayment] Mayar configured OK
[PublicPayment] Request body: {...}
[PublicPayment] Validation OK
[PublicPayment] Creating Mayar payment for order: <order-id> amount: <amount>
[Mayar] createOrderPayment called: {...}
[Mayar] Creating invoice with request: {...}
[Mayar] Fetching: https://sandbox-api.mayar.id/hl/v1/invoice/create
[Mayar] Response status: 200
[Mayar] Invoice created: <invoice-id> link: <payment-link>
[PublicPayment] Mayar payment result: {...}
```

## Related Components

- **`src/components/pos/payment-qris-dialog.tsx`**: Calls the payment API with `orderId`
- **`src/app/(dashboard)/dashboard/pos/page.tsx`**: Triggers the payment dialog after order creation
- **`src/lib/mayar.ts`**: Mayar payment gateway client
- **`src/app/api/payments/public/create/route.ts`**: Payment creation endpoint

## Notes

- The Mayar API key is configured in `.env.local` (sandbox environment)
- The endpoint now gracefully handles both new order creation and payment regeneration
- Error messages are more descriptive to help with debugging
