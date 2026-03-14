# Revenue Sharing Implementation

## Overview
Revenue Sharing allows the Founder to set custom transaction fee settings for specific merchants. This is useful for:
- Giving discounts to loyal/large merchants
- Custom fee structures for enterprise customers
- Special arrangements without affecting the default platform fee

## Files Created/Modified

### Database Schema
- `src/lib/db/schema.ts` - Added `revenueSharingSettings` table

### API Endpoints
- `src/app/api/founder/revenue-sharing/route.ts` - GET, POST, DELETE

### UI Pages
- `src/app/(founder)/founder/dashboard/revenue-sharing/page.tsx` - New page
- `src/components/layout/founder-sidebar.tsx` - Added navigation

## Database Schema

```typescript
export const revenueSharingSettings = pgTable(
  "revenue_sharing_settings",
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid().references(() => organizations.id).unique(),
    
    // Override transaction fee
    customFeeType: text(), // "percentage" | "fixed" | null
    customFeeValue: decimal(),
    customFeeMin: integer(),
    customFeeMax: integer(),
    
    // Founder discount (reduces the fee passed to merchant)
    founderDiscountPercent: decimal().default("0"),
    
    // Notes
    reason: text(),
    
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
  }
);
```

## API Usage

### GET /api/founder/revenue-sharing
Get all revenue sharing settings.

### POST /api/founder/revenue-sharing
Create or update revenue sharing for an organization.

```json
{
  "organizationId": "uuid",
  "customFeeType": "percentage",
  "customFeeValue": "0.3",
  "customFeeMin": 300,
  "customFeeMax": 500,
  "founderDiscountPercent": "0",
  "reason": "Large volume merchant"
}
```

### DELETE /api/founder/revenue-sharing?organizationId={id}
Remove revenue sharing settings.

## Integration with Transaction Fee

When processing orders, the system should check for custom fee settings:

1. Check `revenueSharingSettings` for the organization
2. If found, use custom fee values
3. If not found, use default platform fee

## Notes

- Run `npm run db:push` to create the table
- The founder discount reduces the effective fee that the merchant pays
