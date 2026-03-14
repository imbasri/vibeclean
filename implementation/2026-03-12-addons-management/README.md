# Add-ons Management Feature

## Overview

Founder dashboard now includes an Add-ons management page to view all add-on purchases across all organizations.

## Features

- **View All Purchases**: See all add-on purchases (Custom Domain, WhatsApp Quota) from any organization
- **Filter by Type**: Filter by "All", "Custom Domain", or "WhatsApp Quota"
- **Statistics Dashboard**: View total revenue, active subscriptions, and usage stats
- **Purchase Details**: View organization name, product details, quota usage, pricing, and expiration dates

## Add-on Types

| Type | Description | Quota Field |
|------|-------------|-------------|
| `custom_domain` | Custom domain for organization | N/A |
| `whatsapp_quota` | WhatsApp message quota | `whatsappQuota` / `whatsappUsed` |

## API

### GET /api/founder/addons

Query Parameters:
- `type`: Filter by type (`all`, `custom_domain`, `whatsapp_quota`)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

Response:
```json
{
  "addons": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "organizationName": "Laundry Saya",
      "organizationSlug": "laundry-saya",
      "productId": "uuid",
      "productName": "WhatsApp 100 Pesan",
      "productType": "whatsapp_quota",
      "price": 25000,
      "quota": 100,
      "usedQuota": 45,
      "status": "active",
      "startedAt": "2026-03-01T00:00:00Z",
      "expiresAt": "2026-03-31T00:00:00Z",
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  },
  "stats": {
    "customDomain": { "active": 5, "total": 8 },
    "whatsapp": { "active": 12, "total": 20 },
    "totalRevenue": 2500000
  }
}
```

## Files Changed

- Created: `src/app/(founder)/founder/dashboard/addons/page.tsx`
- Created: `src/app/api/founder/addons/route.ts`
- Updated: `src/components/layout/founder-sidebar.tsx` (already had nav item)

## Database Schema

### addonProducts
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | enum | `custom_domain` or `whatsapp_quota` |
| name | text | Product name |
| price | integer | Price in IDR |
| quota | integer | Quota amount (for whatsapp) |
| durationDays | integer | Validity in days |

### addonPurchases
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organizationId | uuid | FK to organizations |
| productId | uuid | FK to addonProducts |
| status | enum | `pending`, `active`, `expired`, `cancelled` |
| startDate | timestamp | Subscription start |
| endDate | timestamp | Subscription end |
| whatsappQuota | integer | Quota purchased |
| whatsappUsed | integer | Messages used |
