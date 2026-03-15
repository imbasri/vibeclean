# Payment Transaction Error Fix with Zustand

**Tanggal:** 2026-03-15  
**Status:** ✅ Completed  
**Author:** VibeClean Dev Team

---

## 🐛 Masalah

### Error yang Ditemukan

```
POST https://www.imbasri.dev/api/payments/public/create
[HTTP/2 500  1347ms]

Error: Not allowed to define cross-origin object as property on [Object] or [Array] XrayWrapper
TypeError: can't access property "language", data.languages[0] is undefined
```

### Root Cause

1. **MAYAR_API_KEY tidak terkonfigurasi di production**
   - Environment variable `MAYAR_API_KEY` tidak ada di server production
   - API mengembalikan 500 error tanpa fallback yang jelas

2. **State Management yang Tidak Konsisten**
   - Payment state dikelola lokal di component
   - Tidak ada global state untuk tracking payment status
   - Error handling tidak terstruktur dengan baik

3. **Error Messages Tidak Jelas**
   - User tidak tahu apa yang harus dilakukan saat error
   - Tidak ada fallback mode saat payment gateway unavailable

---

## ✅ Solusi

### 1. Payment Store dengan Zustand

**File:** `src/stores/payment-store.ts`

```typescript
import { create } from 'zustand';

interface PaymentState {
  // Current payment being processed
  isProcessing: boolean;
  currentOrderId: string | null;
  currentAmount: number | null;
  
  // Payment result
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  paymentId: string | null;
  transactionId: string | null;
  expiredAt: string | null;
  
  // Error handling
  error: string | null;
  errorCode: string | null;
  
  // Actions
  startPayment: (orderId: string, amount: number) => void;
  setPaymentResult: (result: PaymentResult) => void;
  setError: (error: string, errorCode?: string) => void;
  clearPayment: () => void;
}
```

**Keuntungan Zustand:**
- ✅ Centralized payment state management
- ✅ Type-safe dengan TypeScript
- ✅ Easy to debug dengan DevTools
- ✅ Reusable di seluruh component
- ✅ Automatic cleanup saat unmount

### 2. Enhanced Error Handling di API

**File:** `src/app/api/payments/public/create/route.ts`

```typescript
// Check Mayar configuration
if (!isMayarConfigured()) {
    console.error('[PublicPayment] Mayar not configured - MAYAR_API_KEY missing');
    return NextResponse.json(
        {
            success: false,
            error: 'Payment gateway tidak tersedia',
            fallback: true,
            message: 'Silakan gunakan pembayaran manual (cash/transfer)',
        },
        { status: 503 },
    );
}

// Wrap Mayar API call in try-catch
let paymentResult;
try {
    paymentResult = await createOrderPayment({ /* ... */ });
} catch (mayarError) {
    console.error('[PublicPayment] Mayar API error:', mayarError);
    
    // Rollback order
    await db.delete(orders).where(eq(orders.id, newOrder.id));
    
    // Check error type
    if (mayarError.message.includes('MAYAR_API_KEY')) {
        return NextResponse.json(
            {
                success: false,
                error: 'Payment gateway tidak dikonfigurasi',
                fallback: true,
            },
            { status: 503 },
        );
    }
    
    return NextResponse.json(
        {
            success: false,
            error: 'Gagal membuat pembayaran QRIS',
            details: mayarError.message,
        },
        { status: 500 },
    );
}
```

### 3. Updated PaymentQRISDialog Component

**File:** `src/components/pos/payment-qris-dialog.tsx`

```typescript
export function PaymentQRISDialog({ /* props */ }) {
  // Use Zustand store
  const {
    isProcessing,
    paymentUrl,
    qrCodeUrl,
    error,
    errorCode,
    startPayment,
    setPaymentResult,
    setError,
    clearPayment,
  } = usePaymentStore();

  const createPayment = useCallback(async () => {
    setStatus("creating");
    startPayment(orderId, amount);

    try {
      const response = await fetch("/api/payments/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          customerName,
          customerPhone,
          paymentMethod: "qris",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (response.status === 503) {
          setError(
            "Payment gateway tidak tersedia. Silakan gunakan pembayaran manual.",
            "GATEWAY_UNAVAILABLE"
          );
        } else if (response.status === 500) {
          setError("Terjadi kesalahan server. Silakan coba lagi.", "SERVER_ERROR");
        } else {
          setError(data.error, "PAYMENT_FAILED");
        }
        setStatus("error");
        return;
      }

      // Store in Zustand
      setPaymentResult({
        paymentUrl: data.paymentUrl,
        qrCodeUrl: data.qrCodeUrl,
        paymentId: data.paymentId,
        transactionId: data.transactionId,
        expiredAt: data.expiredAt,
      });
      
      setStatus("waiting");
    } catch (err) {
      setError(err.message, "NETWORK_ERROR");
      setStatus("error");
    }
  }, [orderId, amount, customerName, startPayment, setPaymentResult, setError]);
}
```

### 4. User-Friendly Error Messages

**Error Codes & Messages:**

| Error Code | Status | Message | User Action |
|------------|--------|---------|-------------|
| `GATEWAY_UNAVAILABLE` | 503 | Payment gateway tidak tersedia. Silakan gunakan pembayaran manual (cash/transfer). | Use cash/transfer |
| `SERVER_ERROR` | 500 | Terjadi kesalahan server. Silakan coba lagi nanti. | Try again later |
| `PAYMENT_FAILED` | 400-500 | [Specific error message] | Check details & retry |
| `NETWORK_ERROR` | - | Connection error | Check internet connection |

---

## 📊 Flow Diagram

### Payment Flow with Error Handling

```
┌─────────────┐
│   User      │
│  Click Pay  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  PaymentQRISDialog Opens    │
│  - Uses Zustand Store       │
│  - startPayment() called    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  POST /api/payments/        │
│  public/create              │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ Mayar   │  │ Mayar    │
│ Config  │  │ NOT      │
│ OK ✅   │  │ Config ❌│
└────┬────┘  └────┬─────┘
     │            │
     │            ▼
     │     ┌──────────────────┐
     │     │ Return 503       │
     │     │ + Fallback mode  │
     │     └────────┬─────────┘
     │              │
     ▼              ▼
┌────────────────────────────────┐
│  Component receives response   │
│  - Success: setPaymentResult() │
│  - Error: setError()           │
└────────────┬───────────────────┘
             │
             ▼
      ┌──────┴──────┐
      │             │
      ▼             ▼
┌──────────┐  ┌──────────┐
│  Show    │  │  Show    │
│   QR     │  │  Error   │
│  Code    │  │  Message │
└──────────┘  └──────────┘
```

---

## 📁 Files Changed

| File | Type | Changes |
|------|------|---------|
| `src/stores/payment-store.ts` | NEW | Created Zustand store for payment state management |
| `src/stores/index.ts` | MODIFIED | Exported `usePaymentStore` |
| `src/components/pos/payment-qris-dialog.tsx` | MODIFIED | Integrated Zustand store, enhanced error handling |
| `src/app/api/payments/public/create/route.ts` | MODIFIED | Better error handling, fallback mode, detailed logging |

---

## 🧪 Testing

### 1. Test Normal Flow

```bash
# Start dev server
npm run dev

# Open POS and create order
# Click "Bayar dengan QRIS"
# Verify:
# - Zustand store updated
# - QR code displayed
# - Payment status polling works
```

### 2. Test Error Scenarios

#### A. Mayar Not Configured (503)

```bash
# Temporarily remove MAYAR_API_KEY from .env
unset MAYAR_API_KEY

# Try to create payment
# Expected:
# - Status: 503
# - Error code: GATEWAY_UNAVAILABLE
# - Message: "Payment gateway tidak tersedia..."
```

#### B. Mayar API Error (500)

```bash
# Use invalid API key
MAYAR_API_KEY=invalid_key

# Try to create payment
# Expected:
# - Status: 500
# - Error code: SERVER_ERROR or PAYMENT_CREATION_FAILED
# - Rollback: Order deleted from database
```

### 3. Test Zustand Store

```typescript
// In browser console
import { usePaymentStore } from '@/stores/payment-store';

// Check initial state
console.log(usePaymentStore.getState());

// Simulate payment start
usePaymentStore.getState().startPayment('order-123', 100000);
console.log('After start:', usePaymentStore.getState());

// Simulate result
usePaymentStore.getState().setPaymentResult({
  paymentUrl: 'https://...',
  transactionId: 'txn-123',
});
console.log('After result:', usePaymentStore.getState());

// Clear
usePaymentStore.getState().clearPayment();
console.log('After clear:', usePaymentStore.getState());
```

---

## 🎯 Benefits

### Before Fix

❌ **500 Error** tanpa penjelasan jelas  
❌ **No fallback** saat payment gateway down  
❌ **State management** tidak konsisten  
❌ **User confused** saat error terjadi  

### After Fix

✅ **Clear error messages** dengan error codes  
✅ **Fallback mode** untuk pembayaran manual  
✅ **Zustand store** untuk centralized state  
✅ **Better UX** dengan actionable error messages  
✅ **Proper logging** untuk debugging  
✅ **Database rollback** saat payment failed  

---

## 🔗 References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [VibeClean Payment System](./2026-03-13-balance-payment-system/README.md)
- [Mayar API Documentation](https://docs.mayar.id)

---

## 📝 Next Steps

- [ ] Add payment retry mechanism with exponential backoff
- [ ] Implement payment status webhook for real-time updates
- [ ] Add analytics tracking for payment failures
- [ ] Create admin dashboard for monitoring payment gateway health
- [ ] Add alternative payment methods (manual transfer, cash)
