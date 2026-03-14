# 03 - UI/UX Improvements Log

## Completed Improvements

### Dark Mode Support

**Date:** Session terakhir

**Files Changed:**
- `src/components/providers/theme-provider.tsx` (NEW)
- `src/components/common/theme-toggle.tsx` (NEW)
- `src/app/layout.tsx` (MODIFIED)

**Details:**
- Created ThemeProvider dengan next-themes
- Support: light, dark, system preference
- ThemeToggle component dengan dropdown variant
- Added `suppressHydrationWarning` ke html tag

**Status:** ✅ Selesai

---

### ThemeToggle di Dashboard

**Date:** Session ini

**Files Changed:**
- `src/components/layout/dashboard-layout.tsx` (MODIFIED)

**Details:**
- Added ThemeToggleSimple to TopBar component
- Users can now toggle theme directly from dashboard header

**Status:** ✅ Selesai

---

### Mobile Responsive Orders Page

**Date:** Session ini

**Files Changed:**
- `src/app/(dashboard)/dashboard/orders/page.tsx` (MODIFIED)

**Details:**
- Added mobile card view for orders (visible on screens < md breakpoint)
- Desktop table view hidden on mobile, card view shown instead
- Each order card shows: order number, customer info, items, status badges, total, date
- Dropdown menu for actions on each card

**Status:** ✅ Selesai

---

### Mobile Responsive POS Page

**Date:** Session ini

**Files Changed:**
- `src/app/(dashboard)/dashboard/pos/page.tsx` (MODIFIED)

**Details:**
- Improved mobile layout dengan better max-heights
- Service grid responsive: 2 cols mobile, 3 cols sm, 2 cols lg, 3 cols xl
- TabsList now uses flex-wrap untuk prevent overflow
- ScrollArea max-height adjusted for mobile (40vh) vs desktop

**Status:** ✅ Selesai

---

### Mobile Responsive Customers Page

**Date:** Session ini (Lanjutan)

**Files Changed:**
- `src/app/(dashboard)/dashboard/customers/page.tsx` (MODIFIED)

**Details:**
- Added mobile card view for customers (visible on screens < md breakpoint)
- Desktop table view hidden on mobile, card view shown instead
- Each customer card shows:
  - Avatar with gradient background
  - Name and phone number
  - Loyalty tier badge (Bronze/Silver/Gold/VIP)
  - Stats grid: Total Orders, Total Spent, Loyalty Points
  - Email and member since date
  - Action buttons: Detail, Edit, WhatsApp
- Smooth animations with Framer Motion AnimatePresence

**Status:** ✅ Selesai

---

### Mobile Responsive Staff Page

**Date:** Session ini (Lanjutan)

**Files Changed:**
- `src/app/(dashboard)/dashboard/staff/page.tsx` (MODIFIED)

**Details:**
- Created `StaffMobileCard` component for mobile view
- Desktop table view hidden on mobile, card view shown instead
- Each staff card shows:
  - Avatar with name and email
  - Status badge (Aktif/Pending)
  - Roles per branch in colored badges
  - Join date
  - Action buttons: Edit Peran, Kirim Ulang, Nonaktifkan
- Consistent styling with other mobile card views

**Status:** ✅ Selesai

---

### Reusable Form Components

**Date:** Session ini (Lanjutan)

**Files Created:**
- `src/components/common/form-field.tsx` (NEW)

**Components:**
- `FormInputField` - Input dengan label, error message, password toggle
- `FormTextareaField` - Textarea dengan label, error message
- `FormSelectField` - Native select dengan label, error message
- `FormFieldWrapper` - Wrapper untuk custom inputs
- `FormRow` - Grid untuk side-by-side fields
- `FormErrorMessage` - Standalone error message component
- `FormDescription` - Helper text component

**Features:**
- Integrates with react-hook-form
- Shows validation errors with icon
- Password field dengan show/hide toggle
- Required field indicator (*)
- ARIA attributes for accessibility
- Dark mode support

**Status:** ✅ Selesai

---

### Confirmation Dialogs

**Date:** Session ini (Lanjutan)

**Files Created:**
- `src/components/common/confirm-dialog.tsx` (NEW)

**Components:**
- `ConfirmDialog` - Base confirmation dialog dengan variants (danger, warning, info)
- `DeleteConfirmDialog` - Shorthand untuk delete confirmations
- `CancelOrderDialog` - Specific dialog untuk cancel order

**Features:**
- Animated with Framer Motion
- Loading state support
- Async onConfirm handler
- Customizable icon, labels, and colors
- Mobile-friendly layout

**Status:** ✅ Selesai

---

### Loading & Skeleton Components

**Date:** Session ini (Lanjutan)

**Files Created:**
- `src/components/common/skeleton.tsx` (NEW)

**Components:**
- `Skeleton` - Base skeleton element
- `SkeletonText` - Multi-line text skeleton
- `SkeletonCard` - Card with optional image and actions
- `SkeletonTableRow` - Single table row skeleton
- `SkeletonTable` - Full table skeleton
- `SkeletonStats` - Stats cards skeleton
- `SkeletonPage` - Full page loading skeleton
- `SkeletonList` - Mobile card list skeleton
- `LoadingButtonContent` - Button loading state helper

**Features:**
- Consistent pulse animation
- Dark mode support
- Configurable rows, columns, count

**Status:** ✅ Selesai

---

### Common Components Index

**Date:** Session ini (Lanjutan)

**Files Created:**
- `src/components/common/index.ts` (NEW)

**Details:**
- Central export file for all common components
- Easier imports: `import { FormInputField, ConfirmDialog } from "@/components/common"`

**Status:** ✅ Selesai

---

### Component Integration - Customers Page

**Date:** Session ini (Lanjutan 2)

**Files Modified:**
- `src/app/(dashboard)/dashboard/customers/page.tsx`

**Changes:**
- Replaced manual form fields with `FormInputField` and `FormTextareaField` components
- Removed direct usage of Label, Input, Textarea
- Add/Edit dialogs now use consistent form components with:
  - Required field indicators (*)
  - Description text for optional fields
  - Consistent spacing with `FormRow` grid

**Status:** ✅ Selesai

---

### Component Integration - Services Page

**Date:** Session ini (Lanjutan 2)

**Files Modified:**
- `src/app/(dashboard)/dashboard/services/page.tsx`

**Changes:**
- Replaced manual form fields with `FormInputField`, `FormTextareaField`, `FormRow` components
- Used `FormRow` for side-by-side category/unit and price/estimatedDays fields
- Replaced manual delete confirmation dialog with `DeleteConfirmDialog` component
- Delete dialog now has:
  - Centered icon with danger styling
  - Loading state support
  - Consistent "Hapus" button styling

**Status:** ✅ Selesai

---

### CancelOrderDialog Integration - Orders Page

**Date:** Session ini (Lanjutan 3)

**Files Modified:**
- `src/app/(dashboard)/dashboard/orders/page.tsx`

**Changes:**
- Imported `CancelOrderDialog` from common components
- Added `orders` state to track order list (allows updates)
- Added `isCancelDialogOpen` and `orderToCancel` state
- Created `openCancelDialog` and `handleCancelOrder` handlers
- Added cancel option to mobile dropdown menu (was missing)
- Added onClick handler to desktop cancel button
- Added `CancelOrderDialog` component at end of page
- Order status changes to "cancelled" with success toast

**Status:** ✅ Selesai

---

### Loading States for Form Buttons

**Date:** Session ini (Lanjutan 3)

**Files Modified:**
- `src/app/(dashboard)/dashboard/customers/page.tsx`
- `src/app/(dashboard)/dashboard/services/page.tsx`

**Changes:**
- Added `isSubmitting` state to both pages
- Changed `handleAddCustomer` and `handleEditCustomer` to async functions
- Changed `handleAddService` and `handleEditService` to async functions
- Added simulated API delay (500ms) to show loading state
- Updated dialog footers to use `LoadingButtonContent` component
- Disabled buttons during submission to prevent double-clicks
- Shows spinner and "Menyimpan..." text while loading

**Status:** ✅ Selesai

---

### Delete Customer Functionality

**Date:** Session ini (Lanjutan 4)

**Files Modified:**
- `src/app/(dashboard)/dashboard/customers/page.tsx`

**Changes:**
- Added `DeleteConfirmDialog` import from common components
- Added `Trash2` icon import
- Added `isDeleteDialogOpen` and `customerToDelete` state
- Created `openDeleteDialog` and `handleDeleteCustomer` handlers
- Added delete button to mobile card view (only for owner/manager)
- Added delete option to desktop dropdown menu
- Integrated `DeleteConfirmDialog` component
- Uses PermissionGuard to control visibility based on roles

**Status:** ✅ Selesai

---

### React Hook Form + Zod Validation - Customers Page

**Date:** Session ini (Lanjutan 4)

**Files Modified:**
- `src/app/(dashboard)/dashboard/customers/page.tsx`
- `src/components/common/form-field.tsx`

**Changes:**
- Updated `FormInputField` and `FormTextareaField` to use `React.forwardRef`
- Changed error prop type from `FormFieldError` to `string` for simpler usage
- Added `useForm` with `zodResolver` for both add and edit forms
- Uses `createCustomerSchema` from `@/lib/validations/schemas`
- Added `useEffect` hooks to reset forms when dialogs open
- Refactored handlers to accept `data: CreateCustomerInput`
- Form dialogs now use `<form onSubmit={...}>` pattern
- Field-level error messages displayed below each input

**Status:** ✅ Selesai

---

### React Hook Form + Zod Validation - Services Page

**Date:** Session ini (Lanjutan 5)

**Files Modified:**
- `src/app/(dashboard)/dashboard/services/page.tsx`

**Changes:**
- Added `useForm` with `zodResolver` for both add and edit forms
- Uses `createServiceSchema` from `@/lib/validations/schemas`
- Separate state for `isActiveToggle` and `editIsActiveToggle` (outside form)
- Added `useEffect` hooks to reset forms when dialogs open
- Form dialogs now use `<form onSubmit={...}>` pattern
- Uses `valueAsNumber: true` for price and estimatedDays fields
- Field-level error messages displayed below each input
- Dark mode support added to category badges

**Status:** ✅ Selesai

---

### PermissionGuard Enhancement

**Date:** Session ini (Lanjutan 5)

**Files Modified:**
- `src/components/common/permission-guard.tsx`

**Changes:**
- Added `allowedRoles` as an alias prop for `roles`
- Component now accepts both `roles` and `allowedRoles` interchangeably
- Backwards compatible - existing code using either prop will work
- Fixes TypeScript errors in pages that were using `allowedRoles`

**Status:** ✅ Selesai

---

### Missing UI Components Installed

**Date:** Session ini (Lanjutan 5)

**Files Created:**
- `src/components/ui/switch.tsx`
- `src/components/ui/progress.tsx`

**Changes:**
- Installed Switch component via `npx shadcn@latest add switch`
- Installed Progress component via `npx shadcn@latest add progress`
- Fixes import errors in services and other pages

**Status:** ✅ Selesai

---

### TypeScript Errors Fixed - Select onValueChange

**Date:** Session ini (Lanjutan 6)

**Files Modified:**
- `src/app/(dashboard)/dashboard/orders/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`

**Changes:**
- Fixed Shadcn v4 Select `onValueChange` TypeScript errors
- Shadcn v4 (Base UI) passes `string | null` to `onValueChange`
- Added null guards: `onValueChange={(v) => v && setFilter(v)}`
- Fixed 4 Select components in settings/page.tsx (theme, language, dateFormat, currency)
- Fixed statusConfig in orders/page.tsx - added missing statuses (washing, drying, ironing, delivered)

**Pattern for Shadcn v4 Select:**
```tsx
// WRONG - causes TypeScript error
<Select value={filter} onValueChange={setFilter}>

// CORRECT - guard against null
<Select value={filter} onValueChange={(v) => v && setFilter(v)}>
```

**Status:** ✅ Selesai

---

### React Hook Form + Zod Validation - Staff Invite Dialog

**Date:** Session ini (Lanjutan 6)

**Files Modified:**
- `src/app/(dashboard)/dashboard/staff/page.tsx`

**Changes:**
- Added `useForm` with `zodResolver(inviteStaffSchema)` to InviteStaffDialog
- Form properly resets when dialog opens via `useEffect`
- Email field now uses `register("email")` for validation
- Branch permissions synced to form state via `updateFormBranchPermissions`
- Field-level error messages displayed for email and branchPermissions
- Submit handled via `handleSubmit(onSubmit)` pattern
- Wrapped form content in `<form>` tag

**Status:** ✅ Selesai

---

### React Hook Form + Zod Validation - POS Page

**Date:** Session ini (Lanjutan 7)

**Files Modified:**
- `src/app/(dashboard)/dashboard/pos/page.tsx`

**Changes:**
- Created `posCustomerSchema` for real-time customer validation
- Uses `mode: "onChange"` for instant validation feedback
- Customer name validates: min 1 char (required), min 2 chars
- Customer phone validates: required + Indonesian phone regex
- Fields show red border when invalid with error message below
- "Bayar" button disabled until `isValid` and cart has items
- `handleCheckout` validates via `trigger()` before processing
- Builds full `CreateOrderInput` object with items mapped from cart
- `clearCart` resets both cart state and form via `reset()`

**Status:** ✅ Selesai

---

## Pending Improvements

### 1. Add ThemeToggle to Dashboard ✅

**Priority:** Completed

**Done:** ThemeToggle added to TopBar component

### 2. Mobile Responsiveness

**Priority:** High

**Completed:**
- [x] Orders page - mobile card view added
- [x] POS page - layout and grid improvements
- [x] Customers page - mobile card view added
- [x] Staff page - mobile card view added

**Remaining Issues to fix:**
- [ ] Stats cards text may overflow on small screens
- [ ] Forms need better mobile layout

**Solutions:**
- Add horizontal scroll to tables on mobile
- Use card layout instead of table on mobile
- Stack form fields vertically
- Adjust grid columns for different breakpoints

### 3. Form UX Improvements ✅

**Priority:** Completed

**Components created:**
- [x] FormInputField with error display (with forwardRef)
- [x] FormTextareaField with error display (with forwardRef)
- [x] FormSelectField with error display
- [x] Password show/hide toggle

**Integration completed:**
- [x] Customers page - react-hook-form + Zod validation
- [x] Services page - react-hook-form + Zod validation

**Still needed:**
- [ ] Integrate into Staff invite dialog
- [ ] Integrate into Orders page

### 4. Loading States & Skeletons

**Priority:** Low (Components created, need to integrate)

**Components created:**
- [x] Skeleton base component
- [x] SkeletonTable
- [x] SkeletonCard
- [x] SkeletonPage
- [x] LoadingButtonContent

**Still needed:**
- [x] Add loading states to form submit buttons ✅
- [ ] Integrate skeletons into pages with data loading

### 5. Empty States

**Priority:** Medium

**Pages needing empty states:**
- [ ] Orders (no orders)
- [ ] Customers (no customers)
- [ ] Services (no services)
- [ ] Staff (no staff)

**Pattern:**

```tsx
{items.length === 0 ? (
  <div className="text-center py-12">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold">Belum ada data</h3>
    <p className="mt-1 text-sm text-gray-500">
      Mulai dengan menambahkan item pertama.
    </p>
    <Button className="mt-4">
      <Plus className="mr-2 h-4 w-4" />
      Tambah
    </Button>
  </div>
) : (
  <DataTable data={items} />
)}
```

### 6. Confirmation Dialogs ✅

**Priority:** Completed

**Components created:**
- [x] ConfirmDialog (base)
- [x] DeleteConfirmDialog
- [x] CancelOrderDialog

**Integration completed:**
- [x] Services page - Delete dialog uses DeleteConfirmDialog
- [x] Customers page - Delete dialog uses DeleteConfirmDialog
- [x] Orders page - Cancel order dialog integrated

### 7. Keyboard Navigation

**Priority:** Low

**Improvements:**
- [ ] Escape to close modals
- [ ] Enter to submit forms
- [ ] Tab navigation
- [ ] Keyboard shortcuts for common actions

### 8. Accessibility

**Priority:** Low

**Improvements:**
- [x] ARIA labels (added to form fields)
- [ ] Focus management
- [ ] Screen reader support
- [ ] Color contrast

---

## Design System Notes

### Colors

```css
/* Primary */
--primary: blue-600
--primary-hover: blue-700

/* Status */
--success: green-500
--warning: yellow-500
--error: red-500
--info: blue-500

/* Neutral */
--background: white (light) / gray-950 (dark)
--foreground: gray-900 (light) / white (dark)
--muted: gray-500
--border: gray-200 (light) / gray-800 (dark)
```

### Spacing

- Page padding: `p-4 lg:p-6`
- Card padding: `p-4` or `p-6`
- Gap between items: `gap-4` or `gap-6`
- Stack spacing: `space-y-4` or `space-y-6`

### Typography

- Page title: `text-2xl font-bold`
- Section title: `text-lg font-semibold`
- Card title: `text-base font-medium`
- Body: `text-sm`
- Caption: `text-xs text-gray-500`

### Border Radius

- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Inputs: `rounded-md` (6px)
- Badges: `rounded-full`
