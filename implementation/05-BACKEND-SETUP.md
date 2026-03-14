# 05 - Backend Setup Guide

## Overview

Backend setup menggunakan:
- **Drizzle ORM** untuk database ORM
- **PostgreSQL** (local via Docker)
- **Better Auth** untuk authentication (next phase)

---

## Quick Start

### 1. Start PostgreSQL

```bash
# Start database container
docker-compose up -d

# Check if running
docker ps
```

Database akan tersedia di:
- Host: `localhost`
- Port: `5432`
- Database: `vibeclean`
- User: `vibeclean`
- Password: `vibeclean123`

### 2. Generate Migrations

```bash
# Generate migrations from schema
npm run db:generate
```

### 3. Run Migrations

```bash
# Apply migrations to database
npm run db:migrate
```

### 4. Open Drizzle Studio (Optional)

```bash
# Open visual database browser
npm run db:studio
```

---

## Database Schema

Schema lengkap ada di `src/lib/db/schema.ts`. Tables:

### Core Tables
- `organizations` - Multi-tenant organizations (laundry businesses)
- `users` - User accounts
- `branches` - Branch locations per organization

### Membership Tables
- `organizationMembers` - User membership in organizations
- `branchPermissions` - User roles per branch (multi-role per branch)

### Staff Invitation Tables
- `staffInvitations` - Pending staff invitations
- `invitationPermissions` - Branch permissions for invitations

### Business Tables
- `services` - Laundry services catalog
- `customers` - Customer database
- `orders` - Order records
- `orderItems` - Items in each order
- `orderStatusHistory` - Order status changes audit log

---

## Enums

```ts
// Subscription plans
subscriptionPlanEnum: "starter" | "professional" | "enterprise"

// User roles (per branch)
userRoleEnum: "owner" | "manager" | "cashier" | "courier"

// Service units
serviceUnitEnum: "kg" | "pcs" | "set" | "meter"

// Order status
orderStatusEnum: "pending" | "processing" | "washing" | "drying" | "ironing" | "ready" | "delivered" | "completed" | "cancelled"

// Payment status
paymentStatusEnum: "unpaid" | "partial" | "paid"

// Payment methods
paymentMethodEnum: "cash" | "transfer" | "qris" | "card"
```

---

## Scripts Reference

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly (dev only, no migration files)
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Drop migrations
npm run db:drop
```

---

## File Structure

```
vibeclean/
├── drizzle/
│   └── migrations/        # Generated migration files
├── drizzle.config.ts      # Drizzle Kit configuration
├── docker-compose.yml     # PostgreSQL container
├── .env.local             # Environment variables
├── .env.example           # Template for env vars
└── src/
    └── lib/
        └── db/
            ├── index.ts   # Database connection
            └── schema.ts  # Complete schema definition
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://vibeclean:vibeclean123@localhost:5432/vibeclean

# Better Auth (for next phase)
BETTER_AUTH_SECRET=your-super-secret-key-change-in-production
BETTER_AUTH_URL=http://localhost:3000

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Multi-Role Per Branch

User dapat memiliki role berbeda di branch berbeda dalam satu organization:

```ts
// Example: John is manager at Branch A, cashier at Branch B
branchPermissions = [
  { userId: "john", branchId: "branch-a", role: "manager" },
  { userId: "john", branchId: "branch-b", role: "cashier" },
]
```

Permission check:
1. Get user's permissions for current branch
2. Check if role matches required permission
3. Owner of organization has all permissions automatically

---

## Next Steps

1. **Generate & Run Migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

2. **Setup Better Auth** (Phase 2)
   - Install `better-auth`
   - Configure with organization plugin
   - Create auth API routes

3. **Create Server Actions** (Phase 3)
   - Services CRUD
   - Customers CRUD
   - Orders CRUD
