# 01 - Setup Awal Project

## Langkah-langkah Setup

### 1. Create Next.js Project

```bash
npx create-next-app@latest vibeclean
```

Pilih opsi:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- src/ directory: Yes
- App Router: Yes
- Import alias: @/*

### 2. Install Dependencies

```bash
# UI Components
npx shadcn@latest init

# Form & Validation
npm install react-hook-form @hookform/resolvers zod

# Auth (belum diimplementasi)
npm install better-auth

# Database (belum diimplementasi)
npm install drizzle-orm

# Toast
npm install goey-toast

# Animations
npm install framer-motion

# Carousel (untuk landing page)
npm install embla-carousel-react embla-carousel-autoplay

# Icons
npm install lucide-react

# Date handling
npm install date-fns
```

### 3. Install Shadcn Components

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add scroll-area
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add checkbox
npx shadcn@latest add separator
```

### 4. Setup Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group (login, register)
│   ├── (dashboard)/        # Dashboard route group
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # Shadcn components
│   ├── common/             # Shared/reusable components
│   ├── layout/             # Layout components
│   └── providers/          # Context providers
├── contexts/               # React contexts
├── lib/
│   ├── utils.ts            # Utility functions
│   ├── validations/        # Zod schemas
│   └── data/               # Dummy data (sementara)
└── types/                  # TypeScript types
```

### 5. Configure Tailwind & CSS

File `globals.css` sudah include:
- CSS variables untuk light/dark mode
- Custom colors (blue-600 sebagai primary)
- Base styles

### 6. Setup Providers

Di `app/layout.tsx`:

```tsx
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## File Konfigurasi

### package.json (dependencies utama)

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "typescript": "^5.x",
    "tailwindcss": "^4.x",
    "@shadcn/ui": "^4.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "goey-toast": "^x.x",
    "framer-motion": "^11.x",
    "embla-carousel-react": "^8.x",
    "lucide-react": "^0.x",
    "date-fns": "^3.x"
  }
}
```

### tsconfig.json paths

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Menjalankan Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000` (atau 3001 jika 3000 busy)

## Catatan Penting

1. **Shadcn v4 menggunakan Base UI** - Tidak support `asChild`, gunakan `render` prop
2. **goey-toast** - Import `gooeyToast` dan `GooeyToaster`
3. **Framer Motion easing** - Gunakan typed easing atau cubic bezier array
