# Project Context - VibeClean

## Overview

**VibeClean** adalah platform SaaS multi-tenant untuk bisnis laundry di Indonesia.

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Shadcn UI v4 (menggunakan Base UI) |
| Forms | React Hook Form + Zod |
| Auth | Better Auth (belum diimplementasi) |
| Database | Drizzle ORM (belum diimplementasi) |
| Toast | goey-toast |
| Animations | Framer Motion |
| Carousel | Embla Carousel |

## Fitur Utama

1. **Multi-Tenant** - Satu user bisa punya banyak organisasi/bisnis
2. **Multi-Cabang** - Satu organisasi bisa punya banyak cabang
3. **Multi-Role per Branch** - User bisa punya role berbeda di setiap cabang
   - Contoh: Ahmad jadi Manager di Cabang A, tapi Kasir di Cabang B

## User Roles

| Role | Akses |
|------|-------|
| `owner` | Akses penuh ke semua fitur dan semua cabang |
| `manager` | Kelola operasional, lihat laporan, kelola staff di cabangnya |
| `cashier` | POS, transaksi, kelola pesanan |
| `courier` | Update status pengiriman, pickup |

## Business Model (dari AGENTS.md.txt)

### Subscription Tiers

| Tier | Harga | Cabang | Staff |
|------|-------|--------|-------|
| Starter | Rp 199.000/bulan | 1 | 3 |
| Pro | Rp 499.000/bulan | 5 | 15 |
| Enterprise | Custom | Unlimited | Unlimited |

### Payment Integration
- Mayar untuk pembayaran subscription

### Notifikasi
- WhatsApp Business API untuk notifikasi ke pelanggan

## Important Patterns

### Shadcn v4 Trigger Pattern (PENTING!)

Shadcn v4 menggunakan Base UI yang TIDAK support `asChild` prop. Gunakan `render` prop:

```tsx
// ❌ SALAH (tidak berfungsi di v4)
<DropdownMenuTrigger asChild>
  <Button>Click</Button>
</DropdownMenuTrigger>

// ✅ BENAR (v4 dengan Base UI)
<DropdownMenuTrigger
  render={(props) => (
    <Button {...props}>Click</Button>
  )}
/>
```

### goey-toast Usage

```tsx
import { gooeyToast } from "goey-toast";

gooeyToast.success("Title", { description: "..." });
gooeyToast.error("Title", { description: "..." });
```

### Framer Motion Easing

```tsx
import { type Easing } from "framer-motion";
const easeOut: Easing = [0.16, 1, 0.3, 1];
```

### PermissionGuard Component

```tsx
// Berdasarkan roles
<PermissionGuard allowedRoles={["owner", "manager"]} fallback={<AccessDenied />}>
  <ProtectedContent />
</PermissionGuard>

// Berdasarkan feature
<PermissionGuard feature="billing" fallback={<AccessDenied />}>
  <BillingPage />
</PermissionGuard>
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout dengan providers
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles + Tailwind
│   ├── (auth)/                 # Auth route group
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/            # Dashboard route group
│       ├── layout.tsx
│       └── dashboard/
│           ├── page.tsx        # Overview
│           ├── pos/page.tsx
│           ├── orders/page.tsx
│           ├── services/page.tsx
│           ├── customers/page.tsx
│           ├── reports/page.tsx
│           ├── staff/page.tsx
│           ├── branches/page.tsx
│           ├── billing/page.tsx
│           └── settings/page.tsx
├── components/
│   ├── ui/                     # Shadcn components
│   ├── common/                 # Shared components
│   │   ├── permission-guard.tsx
│   │   └── theme-toggle.tsx
│   ├── layout/                 # Layout components
│   │   ├── dashboard-layout.tsx
│   │   └── branch-switcher.tsx
│   └── providers/              # Context providers
│       ├── toast-provider.tsx
│       └── theme-provider.tsx
├── contexts/
│   └── auth-context.tsx        # Auth state management
├── lib/
│   ├── utils.ts                # Utilities
│   ├── validations/
│   │   └── schemas.ts          # Zod schemas
│   └── data/
│       └── dummy.ts            # Dummy data
└── types/
    └── index.ts                # TypeScript types
```

## Environment

- Platform: Windows
- Working Directory: `C:\Users\anind\imbasri\Project\vibeclean`
- Dev Server: `npm run dev` (port 3000 atau 3001)
