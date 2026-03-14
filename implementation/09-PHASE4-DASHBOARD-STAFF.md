# Phase 4: Dashboard, Branches & Staff Implementation

**Status:** COMPLETED  
**Date:** 2024-01-XX  
**Dependencies:** Phase 3 (Database Connection)

---

## Overview

Phase 4 menghubungkan halaman Dashboard, Branches, dan Staff ke database PostgreSQL, menghapus semua dummy data dan mengimplementasikan full CRUD operations dengan proper authentication & authorization.

---

## 1. Dashboard Stats API

### Created Files
- `src/app/api/dashboard/stats/route.ts`
- `src/hooks/use-dashboard-stats.ts`

### Features
- **Real-time Statistics:** totalRevenue, totalOrders, pendingOrders, completedOrders, averageOrderValue, newCustomers
- **Trend Calculation:** Perbandingan dengan periode sebelumnya
- **Recent Orders:** 5 order terakhir untuk ditampilkan di dashboard
- **Date Range:** Statistics untuk 30 hari terakhir (bisa dikustomisasi)

### API Endpoint
```
GET /api/dashboard/stats
Query params:
  - branchId (optional): Filter stats by specific branch
```

### Hook Usage
```tsx
const { stats, recentOrders, isLoading, error, refetch } = useDashboardStats();
```

---

## 2. Branches API

### Created Files
- `src/app/api/branches/route.ts`
- `src/app/api/branches/[id]/route.ts`
- `src/hooks/use-branches.ts`

### API Endpoints

#### GET /api/branches
List all branches for user's organization
```
Query params:
  - includeStats: "true" to include order statistics per branch
  
Response:
{
  branches: BranchWithStats[],
  total: number
}
```

#### POST /api/branches
Create a new branch (owner only)
```json
{
  "name": "Cabang Sudirman",
  "address": "Jl. Sudirman No. 123",
  "phone": "021-5551234",
  "isActive": true
}
```

#### GET /api/branches/[id]
Get single branch details

#### PATCH /api/branches/[id]
Update branch (owner only)

#### DELETE /api/branches/[id]
Soft delete - marks branch as inactive

### Branch Stats Include
- `totalRevenue`: Total pendapatan bulan ini
- `totalOrders`: Jumlah order bulan ini
- `pendingOrders`: Order yang masih dalam proses
- `completedOrders`: Order yang sudah selesai
- `staffCount`: Jumlah staff yang memiliki akses ke cabang

### Hook Usage
```tsx
const {
  branches,
  isLoading,
  error,
  total,
  refetch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranch,
} = useBranches({ includeStats: true });
```

---

## 3. Staff API

### Created Files
- `src/app/api/staff/route.ts`
- `src/app/api/staff/[memberId]/route.ts`
- `src/hooks/use-staff.ts`

### API Endpoints

#### GET /api/staff
List all staff members in organization (owner/manager only)
```
Response:
{
  staff: StaffMember[],
  total: number
}
```

Staff member includes:
- User info (id, email, name, phone, image, emailVerified)
- `memberId`: Organization member ID (for CRUD operations)
- `permissions`: Array of branch permissions with roles
- `joinedAt`, `createdAt`

#### POST /api/staff
Invite a new staff member
```json
{
  "email": "karyawan@email.com",
  "branchPermissions": [
    {
      "branchId": "uuid",
      "roles": ["cashier", "courier"]
    }
  ]
}
```

Creates a `staff_invitation` record with 7-day expiry.

#### GET /api/staff/[memberId]
Get single staff member details with permissions

#### PATCH /api/staff/[memberId]
Update staff permissions (owner only)
```json
{
  "branchPermissions": [
    {
      "branchId": "uuid",
      "roles": ["manager"]
    }
  ]
}
```

Note: Cannot assign "owner" role through this endpoint.

#### DELETE /api/staff/[memberId]
Remove staff member from organization (owner only)
- Cannot remove self
- Cannot remove owners

### Hook Usage
```tsx
const {
  staff,
  isLoading,
  error,
  total,
  refetch,
  inviteStaff,
  updatePermissions,
  removeStaff,
  getStaffMember,
} = useStaff();
```

---

## 4. Updated Pages

### Dashboard Page (`/dashboard`)
**Changes:**
- Removed `dummyDashboardStats` and `dummyOrders` imports
- Uses `useDashboardStats` hook
- Added loading states with Loader2 spinner
- Added error handling with retry button

### Branches Page (`/dashboard/branches`)
**Changes:**
- Removed all dummy data dependencies
- Uses `useBranches({ includeStats: true })` hook
- All CRUD operations (add, edit, toggle status) now persist to database
- Added loading and error states
- Added submit loading state for forms

### Staff Page (`/dashboard/staff`)
**Changes:**
- Removed `dummyUsers` and `dummyBranches` imports
- Uses `useStaff` and `useBranches` hooks
- Invite dialog fetches branches from API
- Remove staff functionality with confirmation
- Added loading and error states

---

## 5. Database Tables Used

| Table | Usage |
|-------|-------|
| `branches` | Branch CRUD, stats aggregation |
| `orders` | Revenue & order statistics |
| `organization_members` | Staff membership |
| `branch_permissions` | Staff roles per branch |
| `staff_invitations` | Pending invitations |
| `invitation_permissions` | Invited roles per branch |
| `users` | Staff user data |

---

## 6. Authorization Rules

| Endpoint | Required Role |
|----------|---------------|
| GET /api/branches | Any authenticated user |
| POST /api/branches | Owner |
| PATCH /api/branches/[id] | Owner |
| DELETE /api/branches/[id] | Owner |
| GET /api/staff | Owner or Manager |
| POST /api/staff | Owner or Manager |
| PATCH /api/staff/[id] | Owner |
| DELETE /api/staff/[id] | Owner |

---

## 7. Files Modified/Created

### Created This Phase
```
src/app/api/dashboard/stats/route.ts
src/app/api/branches/route.ts
src/app/api/branches/[id]/route.ts
src/app/api/staff/route.ts
src/app/api/staff/[memberId]/route.ts
src/hooks/use-dashboard-stats.ts
src/hooks/use-branches.ts
src/hooks/use-staff.ts
```

### Modified This Phase
```
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/dashboard/branches/page.tsx
src/app/(dashboard)/dashboard/staff/page.tsx
```

---

## 8. Remaining Dummy Data

After Phase 4, the following still use dummy data:
- **None in core dashboard pages**

The following pages may still need updates (low priority):
- Customer page (if exists)
- Reports page (if exists)

---

## 9. Next Steps (Phase 5+)

1. **Email Integration:** Send actual invitation emails via Resend/SendGrid
2. **Invitation Accept Flow:** Handle when invited user registers/logs in
3. **Role Edit Dialog:** UI for editing existing staff permissions
4. **Branch Settings:** Additional branch configuration options
5. **Activity Logs:** Track changes to branches and staff

---

## 10. Testing Checklist

- [ ] Dashboard loads real stats from database
- [ ] Branches page shows branches from database
- [ ] Create branch works and persists
- [ ] Edit branch updates database
- [ ] Toggle branch status works
- [ ] Staff page shows organization members
- [ ] Invite staff creates invitation record
- [ ] Remove staff deletes membership
- [ ] Permission checks work (owner-only operations)
- [ ] Loading states display correctly
- [ ] Error states display with retry option
