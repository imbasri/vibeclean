# Founder Dashboard - Platform Settings Feature

## Overview

Founder dashboard now includes Platform Settings to configure Transaction Fees directly from the UI.

## Features

- **Enable/Disable Transaction Fee**: Toggle whether transaction fees are applied
- **Fee Type**: Choose between percentage (%) or fixed nominal (Rp)
- **Fee Value**: Set the percentage or fixed amount
- **Min/Max Limits**: Set minimum and maximum fee caps
- **Live Preview**: See calculated fees for sample transaction amounts

## API

### GET /api/founder/settings

Returns platform settings including transaction fee configuration.

### PUT /api/founder/settings

Update platform settings.

Request body:
```json
{
  "transactionFee": {
    "feeType": "percentage",
    "feeValue": 0.5,
    "feeMin": 500,
    "feeMax": 1000,
    "enabled": true
  }
}
```

Response:
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "transactionFee": { ... }
  }
}
```

## Files Changed

- Updated: `src/app/(founder)/founder/settings/page.tsx`
- Created: `src/app/api/founder/settings/route.ts`

## Configuration

Transaction fee is calculated as follows:

### Percentage Type
```
fee = (transactionAmount * feeValue) / 100
```

### Fixed Type
```
fee = feeValue
```

### Min/Max Applied
```
if (fee < feeMin) fee = feeMin
if (fee > feeMax) fee = feeMax
```

## Default Values

| Setting | Default |
|---------|---------|
| feeType | percentage |
| feeValue | 0.5% |
| feeMin | Rp 500 |
| feeMax | Rp 1.000 |
| enabled | true |

## Related Documentation

- Transaction fee calculation: `src/lib/config/platform.ts`
- Database settings stored in `platformSettings` table
