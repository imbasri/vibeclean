# POS Page Enhancements

**Date:** March 2026
**Status:** Completed

## Overview

Added customer auto-lookup and WhatsApp notification features to the POS page.

## Features Added

### 1. Customer Auto-Lookup

When the cashier enters a phone number, the system automatically searches for existing customers in the database.

**How it works:**
1. Customer enters phone number
2. After 500ms of inactivity, system calls `/api/customers/lookup?phone=xxx`
3. If customer found, auto-fills the name field
4. Shows green badge indicating "Pelanggan terdaftar"

**API Endpoint:**
- `GET /api/customers/lookup?phone=xxx`
- Returns customer data if found (id, name, totalOrders, totalSpent)

**Files Created:**
```
src/app/api/customers/lookup/route.ts
```

### 2. WhatsApp Notification

After successful order creation, a WhatsApp message is sent to the customer.

**Message includes:**
- Order number
- Total amount
- Payment status
- Estimated completion date

**API Endpoint:**
- `POST /api/notifications/whatsapp`
- Accepts `{ phone, message }`

**Provider Support:**
| Provider | Config | Status |
|----------|--------|--------|
| Fonnte | `WHATSAPP_PROVIDER=fonnte` + `FONNTE_API_KEY` | Ready |
| Mayar | `WHATSAPP_PROVIDER=mayar` + `MAYAR_API_KEY` | Placeholder |
| None (dev) | Default | Logs only |

**Files Created:**
```
src/app/api/notifications/whatsapp/route.ts
```

### 3. POS Page Updates

**Files Modified:**
```
src/app/(dashboard)/dashboard/pos/page.tsx
```

**Changes:**
- Added `useEffect` import
- Added customer lookup state (`foundCustomer`, `isLookingUp`)
- Added auto-lookup effect when phone changes
- Added customer badge in UI when found
- Added WhatsApp notification call after successful order

## Configuration

### WhatsApp Provider Setup

```env
# .env.local

# Choose provider: fonnte, mayar, or none (default)
WHATSAPP_PROVIDER=fonnte

# Fonnte (Indonesia WhatsApp API)
FONNTE_API_KEY=your_fonnte_api_key

# Mayar (coming soon)
# MAYAR_API_KEY=your_mayar_api_key
```

### Fonnte Setup (Recommended for Indonesia)

1. Register at https://fonnte.com/
2. Get API key from dashboard
3. Add to `.env.local`:
   ```
   WHATSAPP_PROVIDER=fonnte
   FONNTE_API_KEY=your_key_here
   ```

## Usage

1. **Customer Lookup:**
   - Enter phone number (min 4 digits)
   - System auto-searches after 500ms
   - If found, name is auto-filled and badge shown

2. **Order Creation:**
   - Fill customer info, add services, set discount
   - Click "Bayar" and confirm payment
   - On success, WhatsApp message is sent automatically

## Notes

- WhatsApp notification is "fire and forget" - doesn't block UI on failure
- If no provider configured, message is logged to console
- Customer lookup is debounced to avoid excessive API calls

## Future Improvements

1. Add customer creation form in POS (for new customers)
2. Show customer loyalty points in POS
3. May WhatsApp integration
4. Receipt printing
5. QRIS payment processing (Mayar integration)
