# Next Steps - VibeClean

## Completed This Session (Latest)

### Phase 7: Settings Page - Database Integration ✅

- Created `/api/settings/profile/route.ts` - GET/PATCH user profile
- Created `/api/settings/organization/route.ts` - GET/PATCH org settings (owner only)
- Created `src/hooks/use-settings.ts` with `useProfile()` and `useOrganization()` hooks
- Updated Settings page to fetch data from API and save changes
- Added loading states and error handling
- Notification & appearance settings stored in localStorage
- **Deleted `src/lib/data/dummy.ts`** - All dummy data removed!
- Documentation: `implementasi/10-PHASE7-SETTINGS.md`

### Summary of All Phases Completed:
- **Phase 3-4**: Dashboard, Branches, Staff pages connected
- **Phase 5**: Reports page with analytics API
- **Phase 6**: Billing page with subscription/usage API
- **Phase 7**: Settings page with profile/organization API
- **Cleanup**: dummy.ts file deleted (587 lines removed)

---

## Completed Previous Sessions

### 29. Authentication Testing & UUID Fix ✅

- **Fixed Better Auth UUID issue**: Added `advanced.database.generateId` config
- Registration flow tested and working
- Login flow tested and working
- Dashboard loads correctly with user info
- Session created in database with proper UUID format
- Theme consistency verified on all pages
- Documentation: `implementasi/07-AUTH-TESTING.md`

**Test User Created:**
- Email: `testuser2@example.com`
- Password: `Password123`
- UUID: `d27dcdcc-f59a-4f92-b2f8-8d68e9c09537`

---

## Completed Earlier Sessions

### 27. Theme "Modern Minimal" Applied ✅

- Applied theme via: `npx shadcn@latest add https://tweakcn.com/r/themes/modern-minimal.json`
- Primary color: Blue (oklch 0.6231 0.1880 259.8145)
- Font: Inter (sans), JetBrains Mono (mono), Source Serif 4 (serif)
- Border radius: 0.375rem (6px)
- File updated: `src/app/globals.css`

### 28. Local PostgreSQL Setup ✅

- Database: `vibeclean` created on `localhost:5432`
- Username: `postgres`, Password: `1`
- Updated `.env.local` with correct DATABASE_URL
- Pushed schema with `npx drizzle-kit push --force`
- **15 tables created** successfully
- Documentation: `implementasi/06-THEME-DATABASE-SETUP.md`

---

## Completed Previous Sessions

### 1. Documentation Files ✅

Created comprehensive documentation in `implementasi/` folder:
- `00-PROJECT-CONTEXT.md` - Tech stack, patterns, file structure
- `01-SETUP-AWAL.md` - Initial setup guide
- `02-FRONTEND-PAGES.md` - All pages documentation
- `03-IMPROVEMENTS.md` - UI/UX improvements log
- `04-BACKEND-PLAN.md` - Backend implementation plan
- `NEXT-STEPS.md` - This file

### 2. ThemeToggle in Dashboard ✅

Added theme toggle button to TopBar so users can switch themes.

### 3. Mobile Responsive Orders ✅

- Added mobile card view for orders page
- Table shown on desktop, cards shown on mobile
- Smooth transitions with Framer Motion

### 4. Mobile Responsive POS ✅

- Improved grid layout for different screen sizes
- Better max-heights for mobile viewing
- Tabs now wrap properly

### 5. Mobile Responsive Customers ✅

- Added mobile card view for customers page
- Shows avatar, name, phone, loyalty badge
- Stats grid: Total Orders, Total Spent, Loyalty Points
- Action buttons: Detail, Edit, WhatsApp

### 6. Mobile Responsive Staff ✅

- Created `StaffMobileCard` component
- Shows avatar, name, email, status badge
- Displays roles per branch in colored badges
- Action buttons: Edit Peran, Kirim Ulang, Nonaktifkan

### 7. Reusable Form Components ✅

Created `src/components/common/form-field.tsx`:
- `FormInputField` - Input with label, error, password toggle (with forwardRef)
- `FormTextareaField` - Textarea with label, error (with forwardRef)
- `FormSelectField` - Select with label, error
- `FormFieldWrapper` - For custom inputs
- `FormRow` - Side-by-side field layout

### 8. Confirmation Dialogs ✅

Created `src/components/common/confirm-dialog.tsx`:
- `ConfirmDialog` - Base dialog with variants (danger, warning, info)
- `DeleteConfirmDialog` - Shorthand for delete confirmations
- `CancelOrderDialog` - For canceling orders

### 9. Loading & Skeleton Components ✅

Created `src/components/common/skeleton.tsx`:
- `Skeleton`, `SkeletonText`, `SkeletonCard`
- `SkeletonTable`, `SkeletonTableRow`
- `SkeletonStats`, `SkeletonPage`, `SkeletonList`
- `LoadingButtonContent`

### 10. Common Components Index ✅

Created `src/components/common/index.ts` for central exports.

### 11. Component Integration ✅

Integrated new reusable components into existing pages:
- **Customers page:** Add/Edit dialogs now use FormInputField, FormTextareaField
- **Services page:** Add/Edit dialogs now use FormInputField, FormTextareaField, FormRow
- **Services page:** Delete dialog replaced with DeleteConfirmDialog

### 12. CancelOrderDialog Integration ✅

- Integrated `CancelOrderDialog` into orders page
- Added cancel option to both mobile and desktop dropdown menus
- Order status changes to "cancelled" with toast notification
- Loading state with spinner during cancel operation

### 13. Loading States for Forms ✅

Added `LoadingButtonContent` and loading states to form submit buttons:
- **Customers page:** Add/Edit dialogs have loading spinner on submit
- **Services page:** Add/Edit dialogs have loading spinner on submit
- Buttons disabled during submission to prevent double-clicks

### 14. Delete Customer Functionality ✅

- Added `DeleteConfirmDialog` integration to customers page
- Added delete button to mobile card view (only for owner/manager)
- Added delete option to desktop dropdown menu
- Uses permission-based visibility

### 15. React Hook Form + Zod Validation ✅

- **Customers page:** Added react-hook-form with Zod validation
  - Separate `addForm` and `editForm` instances
  - `useEffect` hooks to reset forms when dialogs open
  - Field-level error messages displayed

- **Services page:** Added react-hook-form with Zod validation
  - Separate `addForm` and `editForm` instances
  - Uses `createServiceSchema` from validations
  - `valueAsNumber` for price and estimatedDays fields
  - Separate state for isActive toggle (outside form)
  - Field-level error messages displayed

### 16. PermissionGuard Enhancement ✅

- Added `allowedRoles` as an alias for `roles` prop
- Backwards compatible - both props now work
- Fixes TypeScript errors in pages using `allowedRoles`

### 17. Missing UI Components Installed ✅

- Installed `@/components/ui/switch` via shadcn
- Installed `@/components/ui/progress` via shadcn

### 18. Fixed TypeScript Errors ✅

- **orders/page.tsx:** Fixed `statusConfig` - replaced `delivering` with `delivered`, added `washing`, `drying`, `ironing` statuses
- **orders/page.tsx:** Fixed Select `onValueChange` handlers with null guard: `(v) => v && setStatusFilter(v)`
- **settings/page.tsx:** Fixed 4 Select `onValueChange` handlers with null guards for appearance settings

### 19. Staff Invite Dialog - React Hook Form + Zod ✅

- Added `useForm` with `zodResolver(inviteStaffSchema)`
- Form properly resets when dialog opens via `useEffect`
- Email field now uses `register("email")` for validation
- Branch permissions synced to form state for validation
- Field-level error messages displayed for email and branch permissions
- Submit handled via `handleSubmit(onSubmit)` pattern

### 20. POS Page - React Hook Form + Zod ✅

- Created `posCustomerSchema` for real-time customer validation
- Uses `mode: "onChange"` for instant validation feedback
- Customer name/phone fields use `register()` with error display
- Red border on invalid fields with error message below
- "Bayar" button disabled until form is valid and cart has items
- `handleCheckout` validates and builds `CreateOrderInput` data
- `clearCart` also resets the form
- Cart items mapped to schema format on checkout

### 21. Backend Database Setup ✅

- **Drizzle Config:** Created `drizzle.config.ts` with PostgreSQL dialect
- **Database Connection:** Created `src/lib/db/index.ts` with pg Pool
- **Docker Compose:** Created `docker-compose.yml` for local PostgreSQL
- **Environment Files:** Created `.env.local` and `.env.example`
- **Package Scripts:** Added `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:drop`
- **Documentation:** Created `05-BACKEND-SETUP.md` with setup guide

Database schema already created in previous session:
- Organizations, Users, Branches tables
- OrganizationMembers, BranchPermissions (multi-role per branch)
- StaffInvitations, InvitationPermissions
- Services, Customers, Orders, OrderItems, OrderStatusHistory

### 22. Better Auth Setup ✅

- **Installed:** `better-auth` package
- **Schema Updated:** Added `sessions`, `accounts`, `verifications` tables with relations
- **Auth Config:** Created `src/lib/auth.ts` with Drizzle adapter
- **Auth Client:** Created `src/lib/auth-client.ts` for React hooks
- **API Route:** Created `src/app/api/auth/[...all]/route.ts`
- **Env Updated:** Generated secure `BETTER_AUTH_SECRET`

Files created:
- `src/lib/auth.ts` - Server-side auth configuration
- `src/lib/auth-client.ts` - Client-side auth hooks
- `src/app/api/auth/[...all]/route.ts` - API route handler

### 23. Login Page - Better Auth Integration ✅

- Updated `src/app/(auth)/login/page.tsx` to use `signIn.email()`
- Removed demo account info (was using dummy auth)
- Added dark mode support to backgrounds
- Removed dependency on `useAuth` hook for login

### 24. Register Page - Better Auth Integration ✅

- Updated `src/app/(auth)/register/page.tsx` to use `signUp.email()`
- Added dark mode support to all backgrounds and text
- Proper error handling with toast notifications

### 25. AuthContext - Better Auth Integration ✅

- Updated `src/contexts/auth-context.tsx` to use Better Auth session
- Uses `useSession()` hook from `@/lib/auth-client` for authentication state
- Removed `login()` method (now handled by Better Auth directly)
- Added `refreshUser()` method to reload user permissions
- Kept existing role/permission logic for authorization
- Auto-fetches user permissions when Better Auth session changes
- Fixed incorrect `/auth/login` links in dashboard pages to `/login`

### 26. Database Migrations Applied ✅

- ~~Started PostgreSQL Docker container on port **5433**~~ (Now using local PostgreSQL on port 5432)
- Successfully applied all migrations (15 tables created)
- Tested Better Auth endpoint: `GET /api/auth/ok` returns `{"ok":true}`

---

## Immediate Tasks (Next Session)

### 1. Password Change Integration

**Priority:** Medium

Integrate password change functionality with Better Auth:
- Use Better Auth's `changePassword` API
- Validate current password before allowing change
- Handle errors appropriately

### 2. File Upload for Profile/Logo

**Priority:** Medium

- Implement file upload for profile photo
- Implement file upload for organization logo
- Consider using Cloudflare R2 or similar storage

### 3. UI Polish

**Priority:** Low

- Empty state illustrations for list pages
- Add skeleton loading states when fetching data
- Consistent error handling
- Dark mode category badges

### Testing

1. Test all pages on mobile viewport
2. Test dark mode on all pages
3. Test form validations
4. Test Settings page save functionality
5. Test navigation and routing

---

## Implementation Progress

### Phase 1: Database Setup ✅ COMPLETED

1. [x] Setup Drizzle ORM
2. [x] Create database schema
3. [x] Local PostgreSQL (port 5432)
4. [x] Environment variables setup
5. [x] Generate & run migrations (15 tables created)

### Phase 2: Authentication ✅ COMPLETED

1. [x] Configure Better Auth
2. [x] Create auth API routes
3. [x] Update AuthContext to use real auth
4. [x] Update Login page to use Better Auth signIn
5. [x] Update Register page to use Better Auth signUp
6. [x] Run migrations and test auth endpoint

### Phase 3-4: Dashboard & Staff ✅ COMPLETED

1. [x] Dashboard stats from database
2. [x] Branches CRUD
3. [x] Staff management

### Phase 5: Reports ✅ COMPLETED

1. [x] `/api/reports` endpoint with analytics
2. [x] `useReports` hook
3. [x] Reports page connected to API

### Phase 6: Billing ✅ COMPLETED

1. [x] `/api/billing` endpoint with subscription/usage
2. [x] `useBilling` hook
3. [x] Billing page connected to API

### Phase 7: Settings ✅ COMPLETED

1. [x] `/api/settings/profile` endpoint
2. [x] `/api/settings/organization` endpoint
3. [x] `useProfile` and `useOrganization` hooks
4. [x] Settings page connected to API
5. [x] Deleted dummy.ts file

### All Core Pages Connected to Database ✅

- Dashboard ✅
- Branches ✅
- Staff ✅
- Services ✅
- Customers ✅
- Orders ✅
- Reports ✅
- Billing ✅
- Settings ✅

---

## Long-term Tasks

### Integrations

1. **Mayar** - Payment & subscription billing
2. **WhatsApp Business API** - Customer notifications
3. **Email** - Transactional emails (Resend)

### Advanced Features

1. **Reports** - Real analytics with charts
2. **Export** - PDF/Excel export
3. **Notifications** - In-app notifications
4. **Search** - Global search functionality

---

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Database commands (PostgreSQL runs on port 5433)
docker-compose up -d      # Start PostgreSQL
docker-compose down       # Stop PostgreSQL
npm run db:generate       # Generate migrations
npm run db:migrate        # Apply migrations
npm run db:push           # Push schema directly
npm run db:studio         # Open Drizzle Studio
```

---

## Important Reminders

### Shadcn v4 Pattern

```tsx
// Use render prop, NOT asChild
<DropdownMenuTrigger
  render={(props) => (
    <Button {...props}>Click</Button>
  )}
/>
```

### goey-toast Usage

```tsx
import { gooeyToast } from "goey-toast";

gooeyToast.success("Berhasil!", { 
  description: "Data telah disimpan" 
});
```

### Framer Motion Easing

```tsx
import { type Easing } from "framer-motion";
const easeOut: Easing = [0.16, 1, 0.3, 1];
```

---

## Session Handoff Checklist

Before ending a session, make sure to:

1. [ ] Update this NEXT-STEPS.md with current progress
2. [ ] Update 03-IMPROVEMENTS.md with any new improvements made
3. [ ] Commit any code changes with clear messages
4. [ ] Note any bugs or issues discovered
5. [ ] List any decisions made or questions that came up

---

## Questions for User

1. Ready to run migrations? (Requires Docker for PostgreSQL)
2. Any specific mobile devices to prioritize?
3. Priority order for backend features?
4. Any design changes or feedback on current UI?
