# Receipt Printing Feature

**Date:** March 2026
**Status:** Completed

## Overview

Added receipt printing functionality to the POS page. After a successful order, users can print a receipt for the customer.

## How It Works

1. Customer completes payment
2. Success dialog appears with two buttons:
   - **Cetak Nota** - Opens print dialog
   - **Selesai** - Closes dialog and clears cart
3. Clicking "Cetak Nota" opens a new window with the receipt
4. User can print using browser's print function (Ctrl+P or click Cetak button)

## Files Created

```
src/components/pos/receipt-print.tsx
```

## Features

### Receipt Content
- Business name and phone
- Order number and date
- Customer name
- Item list with prices
- Subtotal, discount, and total
- Payment method
- Estimated completion date
- Thank you message

### Print Styles
- Optimized for thermal receipt printers
- Clean, minimal design
- Auto-opens print dialog
- Works with any printer

## Usage

The receipt is automatically available after successful checkout:

1. Complete an order in POS
2. After payment confirmation, success dialog appears
3. Click "Cetak Nota" to print
4. Receipt opens in new window
5. Click "Cetak" or use Ctrl+P to print

## Customization

### Change Business Name
Update the branch information when opening the receipt:
```typescript
openReceiptWindow({
  orderNumber: "ORD-20260310-ABCD",
  customerName: "John Doe",
  // ... other fields
  branchName: "Nama Laundry Anda",
  branchPhone: "021-5551234",
});
```

### Add More Fields
The receipt can be customized by editing `src/components/pos/receipt-print.tsx`.

## Technical Details

- Uses browser's native print functionality
- Opens in new window for isolation
- CSS print media queries for clean printing
- Works on all modern browsers

## Dependencies

No new dependencies required - uses native browser APIs.

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari

## Notes

- For thermal printers, adjust print settings (margins, scale)
- The receipt width is optimized for 58mm-80mm thermal printers
- If popup is blocked, allow popups for the site
