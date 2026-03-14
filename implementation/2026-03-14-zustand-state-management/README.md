# Zustand State Management Implementation

## Overview
This document describes the Zustand state management implementation for VibeClean.

## Installation
```bash
npm install zustand
```

## Store Structure
```
src/stores/
├── index.ts           # Export all stores
├── cart-store.ts    # POS cart management
├── order-store.ts   # Orders list & filters  
├── ui-store.ts      # Global UI state
├── loyalty-store.ts # Loyalty & coupons
├── customer-store.ts # Customer management
├── reports-store.ts # Reports & analytics
├── staff-store.ts  # Staff management
├── branch-store.ts # Branch management
└── settings-store.ts # App settings
```

## Stores

### 1. Cart Store (`cart-store.ts`)
Manages POS (Point of Sale) cart state.

**State:**
- `items`: CartItem[] - items in cart
- `discount`: number - manual discount value
- `discountType`: 'percentage' | 'fixed'
- `couponCode`: string
- `appliedCoupon`: Coupon | null
- `customer`: Customer | null
- `paymentMethod`: string | null
- `notes`: string

**Actions:**
- `addItem(service, quantity?, notes?)` - Add item to cart
- `removeItem(serviceId)` - Remove item from cart
- `updateQuantity(serviceId, quantity)` - Update item quantity
- `updateNotes(serviceId, notes)` - Update item notes
- `setDiscount(discount, type)` - Set manual discount
- `applyCoupon(coupon, code)` - Apply coupon
- `setCustomer(customer)` - Set current customer
- `setPaymentMethod(method)` - Set payment method
- `setNotes(notes)` - Set order notes
- `clearCart()` - Clear all cart data
- `getSubtotal()` - Calculate subtotal
- `getDiscountAmount()` - Calculate discount
- `getTotal()` - Calculate total

### 2. Order Store (`order-store.ts`)
Manages order list filters and pagination.

**State:**
- `filters`: OrderFilters - search, status, payment, sort, page
- `selectedOrder`: Order | null - currently selected order

**Actions:**
- `setSearchQuery(query)` - Set search filter
- `setStatusFilter(status)` - Set status filter
- `setPaymentFilter(payment)` - Set payment filter
- `setSortBy(sort)` - Set sort order
- `setCurrentPage(page)` - Set pagination
- `setSelectedOrder(order)` - Set selected order
- `resetFilters()` - Reset all filters

### 3. UI Store (`ui-store.ts`)
Manages global UI state.

**State:**
- `isSidebarOpen`: boolean - sidebar visibility
- `isDetailDialogOpen`: boolean - order detail dialog
- `isPaymentDialogOpen`: boolean - payment dialog
- `isCancelDialogOpen`: boolean - cancel dialog
- `toasts`: Toast[] - notification toasts

### 4. Loyalty Store (`loyalty-store.ts`)
Manages loyalty tiers and coupons.

**State:**
- `activeTab`: 'tiers' | 'coupons'
- `tiers`: MembershipTier[]
- `coupons`: Coupon[]
- `showTierDialog`: boolean
- `showCouponDialog`: boolean
- `editingTier`: MembershipTier | null
- `editingCoupon`: Coupon | null

### 5. Reports Store (`reports-store.ts`)
Manages reports and analytics state.

**State:**
- `period`: 'today' | 'week' | 'month' | 'quarter' | 'year'
- `activeTab`: 'ringkasan' | 'transaksi' | 'pajak' | 'analytics'
- `taxSettings`: { ppn: { enabled, rate }, pph: { enabled, rate } }

### 6. Customer Store (`customer-store.ts`)
Manages customer list and filters.

### 7. Staff Store (`staff-store.ts`)
Manages staff list and filters.

### 8. Branch Store (`branch-store.ts`)
Manages branch list and filters.

### 9. Settings Store (`settings-store.ts`)
Manages app settings.

## Migration Status

| Component | File | Status |
|-----------|------|--------|
| POS Page | `src/app/(dashboard)/dashboard/pos/page.tsx` | ✅ Migrated |
| Orders Page | `src/app/(dashboard)/dashboard/orders/page.tsx` | ✅ Migrated |
| Dashboard Layout | `src/components/layout/dashboard-layout.tsx` | ✅ Migrated |
| Loyalty Page | `src/app/(dashboard)/dashboard/loyalty/page.tsx` | ✅ Migrated |
| Reports Page | `src/app/(dashboard)/dashboard/reports/page.tsx` | ✅ Migrated |

## Benefits

1. **Global State**: Access cart from anywhere (header, dialogs, etc.)
2. **Performance**: Zustand only re-renders components that subscribe to changed state
3. **DevTools**: Built-in React DevTools integration
4. **Simplicity**: Less boilerplate than Redux
5. **TypeScript**: Full type inference
