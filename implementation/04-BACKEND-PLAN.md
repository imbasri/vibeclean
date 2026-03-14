# 04 - Backend Implementation Plan

## Overview

Backend akan diimplementasi menggunakan:
- **Better Auth** untuk authentication
- **Drizzle ORM** untuk database
- **PostgreSQL** sebagai database (via Supabase atau Neon)
- **Server Actions** untuk API calls

---

## Database Schema

### Users Table

```ts
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Organizations Table

```ts
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  ownerId: text("owner_id").references(() => users.id),
  subscriptionTier: text("subscription_tier").default("starter"), // starter, pro, enterprise
  subscriptionStatus: text("subscription_status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Branches Table

```ts
export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Members Table (User-Branch-Role relation)

```ts
export const members = pgTable("members", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  organizationId: text("organization_id").references(() => organizations.id),
  branchId: text("branch_id").references(() => branches.id),
  role: text("role").notNull(), // owner, manager, cashier, courier
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint: user can only have one role per branch
  uniqueUserBranch: unique().on(table.userId, table.branchId),
}));
```

### Services Table

```ts
export const services = pgTable("services", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents/rupiah
  unit: text("unit").notNull(), // kg, pcs, set
  category: text("category"), // cuci, setrika, dry-clean, dll
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Customers Table

```ts
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Orders Table

```ts
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  branchId: text("branch_id").references(() => branches.id),
  customerId: text("customer_id").references(() => customers.id),
  status: text("status").notNull(), // pending, processing, ready, delivered, cancelled
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, partial, paid
  pickupDate: timestamp("pickup_date"),
  deliveryDate: timestamp("delivery_date"),
  notes: text("notes"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Order Items Table

```ts
export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id),
  serviceId: text("service_id").references(() => services.id),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  subtotal: integer("subtotal").notNull(),
});
```

---

## Better Auth Setup

### Installation

```bash
npm install better-auth
```

### Configuration

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      // Custom roles
      roles: {
        owner: {
          // Full access
        },
        manager: {
          // Branch management
        },
        cashier: {
          // POS and orders
        },
        courier: {
          // Delivery updates
        },
      },
    }),
  ],
});
```

### Auth Client

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

---

## Server Actions Structure

```
src/
├── actions/
│   ├── auth.ts           # Auth actions (login, register, logout)
│   ├── organizations.ts  # Organization CRUD
│   ├── branches.ts       # Branch CRUD
│   ├── services.ts       # Service CRUD
│   ├── customers.ts      # Customer CRUD
│   ├── orders.ts         # Order CRUD
│   └── reports.ts        # Report queries
```

### Example Server Action

```ts
// src/actions/services.ts
"use server";

import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function createService(data: CreateServiceInput) {
  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const service = await db.insert(services).values({
    id: crypto.randomUUID(),
    organizationId: session.user.organizationId,
    ...data,
  }).returning();

  revalidatePath("/dashboard/services");
  
  return service[0];
}

export async function updateService(id: string, data: UpdateServiceInput) {
  // ... implementation
}

export async function deleteService(id: string) {
  // ... implementation
}
```

---

## Implementation Order

### Phase 1: Auth & User Management

1. [x] Setup Drizzle ORM dengan PostgreSQL
2. [x] Configure Better Auth
3. [x] Create auth API routes
4. [ ] Update AuthContext to use Better Auth (integrate with existing context)
5. [ ] Implement login/register pages dengan Better Auth
6. [ ] Session management
7. [ ] Generate & run migrations (needs Docker)

### Phase 2: Organization & Branch

1. [ ] Organization CRUD
2. [ ] Branch CRUD
3. [ ] Member management (invite, assign roles)
4. [ ] Branch switcher dengan real data

### Phase 3: Core Features

1. [ ] Services CRUD
2. [ ] Customers CRUD
3. [ ] Orders CRUD
4. [ ] Order status workflow

### Phase 4: Advanced Features

1. [ ] Reports & Analytics
2. [ ] Billing & Subscription (Mayar integration)
3. [ ] WhatsApp notifications
4. [ ] Export functionality

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Mayar (payment)
MAYAR_API_KEY=...

# WhatsApp
WHATSAPP_API_KEY=...
WHATSAPP_PHONE_NUMBER_ID=...
```

---

## API Routes (if needed)

```
src/app/api/
├── auth/
│   └── [...all]/route.ts    # Better Auth handler
├── webhooks/
│   ├── mayar/route.ts       # Payment webhooks
│   └── whatsapp/route.ts    # WhatsApp webhooks
```
