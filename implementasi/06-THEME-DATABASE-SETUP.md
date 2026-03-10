# 06 - Theme & Database Setup (Local PostgreSQL)

## Tanggal: Session Ini

---

## 1. Theme "Modern Minimal" Applied

### Command yang Dijalankan:
```bash
npx shadcn@latest add https://tweakcn.com/r/themes/modern-minimal.json --yes
```

### Files Updated:
- `src/app/globals.css`

### Warna Theme:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Primary** | Blue (`oklch(0.6231 0.1880 259.8145)`) | Same |
| **Background** | White (`oklch(1.0000 0 0)`) | Dark (`oklch(0.2046 0 0)`) |
| **Card** | White | Dark gray (`oklch(0.2686 0 0)`) |
| **Foreground** | Dark gray (`oklch(0.3211 0 0)`) | White (`oklch(0.9219 0 0)`) |
| **Destructive** | Red (`oklch(0.6368 0.2078 25.3313)`) | Same |

### Font:
- **Sans:** Inter
- **Mono:** JetBrains Mono
- **Serif:** Source Serif 4

### Border Radius:
- Default: `0.375rem` (6px)

---

## 2. Database Setup (Local PostgreSQL)

### Konfigurasi:

| Setting | Value |
|---------|-------|
| **Host** | localhost |
| **Port** | 5432 |
| **Username** | postgres |
| **Password** | 1 |
| **Database** | vibeclean |

### Files Updated:
- `.env.local` - Updated DATABASE_URL

```env
# Database (Local PostgreSQL)
DATABASE_URL=postgresql://postgres:1@localhost:5432/vibeclean
```

### Commands yang Dijalankan:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE vibeclean;"

# Push schema to database
npx drizzle-kit push --config drizzle.config.ts --force
```

### Tables Created (15 Total):

| No | Table Name | Description |
|----|-----------|-------------|
| 1 | `users` | User accounts |
| 2 | `sessions` | Auth sessions (Better Auth) |
| 3 | `accounts` | OAuth accounts (Better Auth) |
| 4 | `verifications` | Email verifications (Better Auth) |
| 5 | `organizations` | Laundry businesses |
| 6 | `organization_members` | User-org relationships |
| 7 | `branches` | Branch locations |
| 8 | `branch_permissions` | Role per branch |
| 9 | `staff_invitations` | Staff invites |
| 10 | `invitation_permissions` | Invite-branch roles |
| 11 | `services` | Laundry services |
| 12 | `customers` | Customer data |
| 13 | `orders` | Order headers |
| 14 | `order_items` | Order line items |
| 15 | `order_status_history` | Status change log |

### Enums Created:

| Enum | Values |
|------|--------|
| `user_role` | owner, manager, cashier, courier |
| `invitation_status` | pending, accepted, expired |
| `order_status` | pending, processing, washing, drying, ironing, ready, delivered, completed, cancelled |
| `payment_status` | unpaid, partial, paid, refunded |
| `payment_method` | cash, qris, transfer, ewallet |
| `service_category` | cuci, setrika, cuci_setrika, dry_clean, express, khusus |
| `service_unit` | kg, pcs, meter, pasang |
| `subscription_plan` | starter, pro, enterprise |
| `subscription_status` | active, trial, expired, cancelled |

---

## 3. Verify Database

```bash
# Connect to database
psql -U postgres -d vibeclean

# List all tables
\dt

# Check specific table structure
\d users
\d orders
```

---

## 4. Next Steps

### High Priority:
1. [ ] Run `npm run dev` dan test halaman login/register
2. [ ] Test auth flow (register -> login -> dashboard)
3. [ ] Connect user permissions ke database (API endpoints)

### Medium Priority:
4. [ ] Implement Services CRUD (connect ke real database)
5. [ ] Implement Customers CRUD
6. [ ] Implement Orders CRUD

---

## 5. Commands Reference

```bash
# Development
npm run dev

# Database
npm run db:generate    # Generate migrations
npm run db:migrate     # Apply migrations
npm run db:push        # Push schema directly
npm run db:studio      # Open Drizzle Studio (GUI)

# PostgreSQL CLI
psql -U postgres -d vibeclean    # Connect to DB
\dt                               # List tables
\d tablename                      # Show table structure
```

---

## Status: COMPLETED
