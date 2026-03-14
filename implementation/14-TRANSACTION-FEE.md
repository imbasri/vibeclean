# Transaction Fee System

## Overview

Transaction Fee adalah sistem untuk mengambil margin kecil dari setiap transaksi payment via Mayar. Ini adalah salah satu sumber pendapatan utama (revenue stream) untuk VibeClean sebagai platform SaaS.

## Konfigurasi Default

| Parameter | Default Value | Deskripsi |
|-----------|--------------|-----------|
| `feeType` | `percentage` | Tipe fee: `fixed` atau `percentage` |
| `feeValue` | `0.5` | Nilai fee (0.5% untuk percentage, atau nominal fixed) |
| `feeMin` | `500` | Minimum fee dalam Rupiah |
| `feeMax` | `1000` | Maximum fee dalam Rupiah |
| `enabled` | `true` | Apakah fee aktif atau tidak |

## Calculation Logic

```typescript
function calculateTransactionFee(amount: number, settings: TransactionFeeSettings): number {
  let fee = 0;
  
  if (settings.feeType === "percentage") {
    fee = (amount * settings.feeValue) / 100;
  } else {
    fee = settings.feeValue; // fixed amount
  }
  
  // Apply min/max bounds
  if (settings.feeMin && fee < settings.feeMin) {
    fee = settings.feeMin;
  }
  if (settings.feeMax && fee > settings.feeMax) {
    fee = settings.feeMax;
  }
  
  return Math.round(fee);
}
```

## Example Calculations

### Default Settings (Percentage: 0.5%, Min: Rp 500, Max: Rp 1000)

| Transaction Amount | Calculation | Fee |
|-------------------|------------|-----|
| Rp 50.000 | (50000 × 0.5%) = Rp 250 < min | **Rp 500** |
| Rp 100.000 | (100000 × 0.5%) = Rp 500 | **Rp 500** |
| Rp 200.000 | (200000 × 0.5%) = Rp 1000 | **Rp 1000** |
| Rp 500.000 | (500000 × 0.5%) = Rp 2500 > max | **Rp 1000** |
| Rp 1.000.000 | (1000000 × 0.5%) = Rp 5000 > max | **Rp 1000** |

### Alternative Settings (Fixed: Rp 1000)

| Transaction Amount | Fee |
|-------------------|-----|
| Rp 50.000 | **Rp 1000** |
| Rp 100.000 | **Rp 1000** |
| Rp 500.000 | **Rp 1000** |

## Database Schema

### New Tables

- `platform_settings` - Untuk menyimpan konfigurasi platform secara dinamis
- `orders.transaction_fee` - Untuk menyimpan fee per transaksi

### Fields Added to Orders

```sql
ALTER TABLE orders ADD COLUMN transaction_fee decimal(15,2) NOT NULL DEFAULT '0';
```

## API Endpoints

### Get Current Settings

```http
GET /api/settings/platform/fees
```

Response:
```json
{
  "success": true,
  "settings": {
    "feeType": "percentage",
    "feeValue": 0.5,
    "feeMin": 500,
    "feeMax": 1000,
    "enabled": true
  }
}
```

### Update Settings

```http
PUT /api/settings/platform/fees
Content-Type: application/json

{
  "feeType": "percentage",
  "feeValue": 1,
  "feeMin": 1000,
  "feeMax": 2000
}
```

### Preview Fee Calculation

```http
POST /api/settings/platform/fees/preview
Content-Type: application/json

{
  "amount": 100000,
  "feeType": "percentage",
  "feeValue": 0.5,
  "feeMin": 500,
  "feeMax": 1000
}
```

Response:
```json
{
  "success": true,
  "preview": {
    "fee": 500,
    "netAmount": 99500,
    "settings": {
      "feeType": "percentage",
      "feeValue": 0.5,
      "feeMin": 500,
      "feeMax": 1000,
      "enabled": true
    }
  }
}
```

## Files Modified/Created

| File | Action |
|------|--------|
| `src/lib/db/schema.ts` | Added `platformSettings` table, `transactionFee` field in orders |
| `src/lib/config/platform.ts` | Created - Core logic for fee calculation |
| `src/app/api/webhooks/mayar/route.ts` | Updated - Calculate & store fee on payment |
| `src/app/api/settings/platform/fees/route.ts` | Created - API for settings management |

## How It Works

1. **Configuration**: Admin sets fee configuration via API
2. **Payment Received**: When Mayar webhook receives payment notification
3. **Calculate Fee**: System calculates fee based on configuration
4. **Store**: Fee is stored in `orders.transaction_fee`
5. **Reporting**: Can be queried for total fees collected

## Future Enhancements

- [ ] UI Dashboard untuk atur fee settings
- [ ] Reporting API untuk lihat total fee per periode
- [ ] Fee per organization (bisa berbeda per org)
- [ ] Fee breakdown (admin fee, platform fee, dll)
