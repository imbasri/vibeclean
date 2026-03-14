# VibeClean - Platform Manajemen Laundry #1 di Indonesia

<div align="center">

![VibeClean Logo](/public/logo_vibeclean.png)

**Platform all-in-one untuk mengelola bisnis laundry Anda dengan mudah dan efisien**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Private-green)](LICENSE)

[Fitur](#-fitur) • [Teknologi](#-tech-stack) • [Demo](#-demo-application) • [Cara Menggunakan](#-cara-menggunakan) • [Struktur Folder](#-struktur-folder) • [API Documentation](#-api-documentation) • [Presentation](#-presentation)

</div>

---

## 🎥 Demo Application

Watch VibeClean in action with Mayar Payment Gateway integration:

- 🎬 **[Demo: VibeClean with Mayar QRIS Payment](https://www.awesomescreenshot.com/video/50438843?key=4701d2203dd365ff6a9e992ed5c2fd1f)** - Complete POS flow with QRIS payment integration

---

## 📖 Tentang VibeClean

VibeClean adalah platform SaaS (Software as a Service) berbasis web yang dirancang khusus untuk membantu pemilik bisnis laundry mengelola operasional sehari-hari dengan lebih efisien. Dengan fitur lengkap mulai dari kasir POS, manajemen pesanan, loyalty program, hingga analitik bisnis, VibeClean membantu Anda meningkatkan produktivitas dan omzet bisnis laundry.

### 🎯 Keunggulan VibeClean

- ✅ **Multi-branch Support** - Kelola banyak cabang dalam satu dashboard
- ✅ **Real-time Analytics** - Pantau performa bisnis secara real-time
- ✅ **Automated Workflow** - Otomatisasi proses bisnis untuk efisiensi
- ✅ **Customer Loyalty** - Program member dan loyalty points
- ✅ **Payment Gateway** - Integrasi dengan Mayar (QRIS, VA, E-Wallet)
- ✅ **Mobile Responsive** - Akses dari device apapun

---

## ✨ Fitur Utama

### 🏪 **Point of Sale (POS)**

- Kasir digital dengan interface yang user-friendly
- Support pembayaran tunai, QRIS, transfer, dan e-wallet
- Auto-generate QR code untuk pembayaran
- Receipt printing otomatis
- Member discount auto-apply

### 📦 **Manajemen Pesanan**

- Tracking status pesanan real-time
    - Menunggu → Diproses → Dicuci → Dikeringkan → Disetrika → Siap Ambil → Selesai
- Notifikasi WhatsApp otomatis
- Estimated completion time
- Order history dan search

### 👥 **Manajemen Pelanggan**

- Customer database terpusat
- Loyalty points system
- Member packages (bulanan/tahunan)
- Customer tier (Bronze, Silver, Gold, VIP)
- Purchase history tracking

### 🎁 **Paket Member & Loyalty**

- 4 tipe paket member dengan benefit berbeda
- Auto-apply discount untuk member
- Transaction limits per month
- Points accumulation
- Tier upgrade system

### 🏢 **Manajemen Cabang**

- Multi-branch management (Pro: 5 cabang, Enterprise: unlimited)
- Branch-specific settings
- QR code customization per cabang
- Staff assignment per cabang
- Revenue tracking per cabang

### 👨‍💼 **Manajemen Karyawan**

- Role-based access control (Owner, Manager, Cashier)
- Staff performance tracking
- Permission management
- Activity logs

### 📊 **Laporan & Analytics**

- Revenue reports (harian, mingguan, bulanan)
- Order statistics
- Customer analytics
- Staff performance
- Export to Excel/PDF
- Tax reports dengan PDF export

### 💳 **Billing & Subscription**

- 3 paket langganan:
    - **Starter** - GRATIS (1 cabang, 3 staff, 100 order/bln)
    - **Pro** - Rp 149.000/bln (5 cabang, 10 staff/staff, unlimited order)
    - **Enterprise** - Custom pricing (unlimited everything)
- Mayar payment integration
- Invoice management
- Auto-renewal support

### ⚙️ **Pengaturan**

- Organization settings
- Tax configuration (PPN)
- Custom QR code colors
- Notification preferences
- Profile management

---

## 🛠️ Tech Stack

### **Frontend**

- **Framework:** [Next.js 16.1.6](https://nextjs.org) (App Router)
- **Language:** [TypeScript 5](https://www.typescriptlang.org)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **UI Components:** [Shadcn/UI](https://ui.shadcn.com)
- **Animations:** [Framer Motion](https://www.framer.com/motion)
- **Charts:** [Recharts](https://recharts.org)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs)
- **Forms:** [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)

### **Backend**

- **Database:** [PostgreSQL](https://www.postgresql.org)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://www.better-auth.com)
- **Payment:** [Mayar API](https://docs.mayar.id)
- **File Upload:** [UploadThing](https://uploadthing.com)
- **Email:** [Resend](https://resend.com)
- **PDF Generation:** [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Excel Export:** [XLSX](https://sheetjs.com)

### **DevOps & Tools**

- **Package Manager:** npm
- **Linting:** ESLint 9
- **Testing:** Playwright (E2E)
- **Deployment:** Vercel / Self-hosted

---

## 🚀 Cara Menggunakan

### **Prerequisites**

- Node.js 18+
- PostgreSQL 14+
- npm / yarn / pnpm

### **1. Clone Repository**

```bash
git clone https://github.com/your-org/vibeclean.git
cd vibeclean
```

### **2. Install Dependencies**

```bash
npm install
```

### **3. Setup Environment Variables**

Buat file `.env.local` di root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vibeclean"

# Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# Mayar Payment
MAYAR_API_KEY="your-mayar-api-key"
MAYAR_ENV="sandbox"  # atau "production"

# UploadThing
UPLOADTHING_TOKEN="your-uploadthing-token"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"

# WhatsApp (optional)
WHATSAPP_API_KEY="your-whatsapp-api-key"
```

### **4. Setup Database**

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Push schema directly (development only)
npm run db:push
```

### **5. Run Development Server**

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### **6. Build for Production**

```bash
npm run build
npm start
```

---

## 📁 Struktur Folder

```
vibeclean/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth pages (login, register)
│   │   ├── (dashboard)/          # Dashboard pages
│   │   │   └── dashboard/        # Owner dashboard
│   │   │       ├── pos/          # Point of Sale
│   │   │       ├── orders/       # Order management
│   │   │       ├── customers/    # Customer management
│   │   │       ├── members/      # Member packages
│   │   │       ├── loyalty/      # Loyalty program
│   │   │       ├── branches/     # Branch management
│   │   │       ├── staff/        # Staff management
│   │   │       ├── balance/      # Balance & withdrawals
│   │   │       ├── billing/      # Subscription billing
│   │   │       ├── settings/     # Settings
│   │   │       └── reports/      # Reports & analytics
│   │   ├── (founder)/            # Founder/Super Admin
│   │   │   └── founder/
│   │   │       ├── dashboard/    # Founder dashboard
│   │   │       └── settings/     # Founder settings
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # Auth endpoints
│   │   │   ├── orders/           # Order endpoints
│   │   │   ├── customers/        # Customer endpoints
│   │   │   ├── member-packages/  # Member package endpoints
│   │   │   ├── billing/          # Billing endpoints
│   │   │   └── ...
│   │   ├── track/                # Public order tracking
│   │   └── page.tsx              # Landing page
│   ├── components/
│   │   ├── ui/                   # Shadcn UI components
│   │   ├── common/               # Reusable components
│   │   ├── layout/               # Layout components
│   │   └── pos/                  # POS-specific components
│   ├── contexts/                 # React contexts
│   │   └── auth-context.tsx      # Auth context
│   ├── hooks/                    # Custom hooks
│   │   ├── use-orders.ts
│   │   ├── use-customers.ts
│   │   ├── use-member-packages.ts
│   │   └── ...
│   ├── lib/
│   │   ├── db/                   # Database schema & config
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   └── index.ts          # DB connection
│   │   ├── validations/          # Zod schemas
│   │   ├── utils.ts              # Utility functions
│   │   ├── auth.ts               # Auth config
│   │   └── mayar.ts              # Mayar client
│   ├── stores/                   # Zustand stores
│   │   ├── cart-store.ts
│   │   ├── customer-store.ts
│   │   ├── order-store.ts
│   │   ├── stats-store.ts
│   │   └── subscription-store.ts
│   └── types/                    # TypeScript types
│       └── index.ts
├── public/                       # Static files
│   └── logo_vibeclean.png
├── implementation/               # Implementation docs
├── drizzle.config.ts            # Drizzle config
├── next.config.ts               # Next.js config
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
└── package.json
```

---

## 📡 API Documentation

### **Authentication**

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/session` - Get current session

### **Orders**

- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/[id]` - Update order status
- `DELETE /api/orders/[id]` - Delete order

### **Customers**

- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer
- `GET /api/customers/search?q=` - Search customers

### **Member Packages**

- `GET /api/member-packages` - List packages
- `POST /api/member-packages` - Create package
- `PUT /api/member-packages/[id]` - Update package
- `POST /api/member-packages/apply` - Apply member discount
- `GET /api/member-packages/subscriptions` - List subscriptions
- `POST /api/member-packages/subscriptions` - Create subscription

### **Billing**

- `GET /api/billing` - Get subscription info
- `POST /api/billing/subscribe` - Create subscription
- `POST /api/billing/invoice/[id]/payment-link` - Get payment link
- `POST /api/billing/invoice/[id]/confirm-payment` - Confirm payment
- `POST /api/billing/invoice/[id]/force-activate` - Force activate subscription

### **Branches**

- `GET /api/branches` - List branches
- `POST /api/branches` - Create branch
- `PUT /api/branches/[id]` - Update branch
- `GET /api/branches/[id]/qrcode` - Get QR code

### **Reports**

- `GET /api/reports` - Get revenue report
- `GET /api/reports/tax` - Get tax report
- `GET /api/reports/export` - Export to Excel

---

## 👥 User Roles

### **Owner**

- Full access to all features
- Can manage branches, staff, and settings
- View all reports and analytics

### **Manager**

- Manage orders and customers
- View reports (limited)
- Cannot delete data

### **Cashier**

- Access to POS only
- Create and manage orders
- Cannot access reports or settings

### **Founder (Super Admin)**

- Manage all organizations
- View platform-wide analytics
- Activate/deactivate features
- Manage subscriptions

---

## 📸 Screenshots

### Landing Page

![Landing Page](/public/screenshots/landing.png)

### Dashboard POS

![POS](/public/screenshots/pos.png)

### Order Management

![Orders](/public/screenshots/orders.png)

### Member Packages

![Members](/public/screenshots/members.png)

### Analytics

![Analytics](/public/screenshots/analytics.png)

### Billing & Subscription

![Billing](/public/screenshots/billing.png)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 📞 Support

For support, email support@vibeclean.id or join our WhatsApp community.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React Framework
- [Shadcn/UI](https://ui.shadcn.com) - Beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [Mayar](https://mayar.id) - Payment Gateway
- [Vercel](https://vercel.com) - Deployment Platform

---

## 📊 Presentation

View our project presentation and pitch deck:

- 🎯 **[VibeClean Presentation](https://chat.z.ai/space/f1q8c21jjz11-art)** - Project overview, features, and business model

---

<div align="center">

**Built with ❤️ by VibeClean Team**

[Website](https://www.imbasri.dev)

</div>
