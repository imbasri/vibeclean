# Zustand CRUD Migration Plan

**Date**: 2026-03-15  
**Objective**: Migrate all CRUD operations from React hooks to Zustand stores for better state management, reusability, and performance.

---

## 📋 Current State

### Existing Zustand Stores
- ✅ `cart-store.ts` - POS cart management
- ✅ `order-store.ts` - Order state management
- ✅ `customer-store.ts` - Customer CRUD operations
- ✅ `branch-store.ts` - Branch management
- ✅ `staff-store.ts` - Staff management
- ✅ `service-store.ts` - Service management
- ✅ `loyalty-store.ts` - Loyalty/coupons
- ✅ `reports-store.ts` - Reports generation
- ✅ `settings-store.ts` - Settings management
- ✅ `stats-store.ts` - Dashboard statistics
- ✅ `subscription-store.ts` - Subscription management
- ✅ `ui-store.ts` - UI state
- ✅ `balance-store.ts` - Balance & withdrawals (needs creation)

### Existing Hooks (To Be Migrated)
- ❌ `use-orders.ts` - Should use `order-store`
- ❌ `use-customers.ts` - Should use `customer-store`
- ❌ `use-branches.ts` - Should use `branch-store`
- ❌ `use-staff.ts` - Should use `staff-store`
- ❌ `use-services.ts` - Should use `service-store`
- ❌ `use-member-packages.ts` - Should use `member-packages-store`
- ❌ `use-coupons.ts` - Should use `loyalty-store`
- ❌ `use-reports.ts` - Should use `reports-store`
- ❌ `use-settings.ts` - Should use `settings-store`
- ❌ `use-dashboard-stats.ts` - Should use `stats-store`
- ❌ `use-billing.ts` - Should use `billing-store`
- ❌ `use-balance.ts` - Should use `balance-store`

---

## 🎯 Target Architecture

### Store Structure (CRUD Pattern)

Each store should follow this pattern:

```typescript
interface EntityState {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EntitySlice {
  // State
  entities: EntityState[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // CRUD Operations
  fetchAll: (params?: QueryParams) => Promise<void>;
  fetchById: (id: string) => Promise<EntityState>;
  create: (data: CreateData) => Promise<EntityState>;
  update: (id: string, data: UpdateData) => Promise<EntityState>;
  delete: (id: string) => Promise<void>;

  // Local Operations
  getById: (id: string) => EntityState | undefined;
  getAll: () => EntityState[];
  clear: () => void;
  setError: (error: string) => void;
}
```

---

## 📝 Migration Steps

### Phase 1: Enhance Existing Stores (Priority: HIGH)

#### 1.1 Customer Store ✅
**Current**: Basic CRUD operations  
**Missing**: Pagination, search, export

```typescript
// Add to customer-store.ts
interface CustomerSlice {
  // ... existing state
  search: (query: string) => Promise<Customer[]>;
  export: (format: 'csv' | 'xlsx') => Promise<void>;
  getCustomerStats: () => CustomerStats;
}
```

#### 1.2 Order Store ✅
**Current**: Order state management  
**Missing**: Status updates, printing, advanced filtering

```typescript
// Add to order-store.ts
interface OrderSlice {
  // ... existing state
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  printInvoice: (id: string) => Promise<void>;
  getOrdersByDate: (date: Date) => Order[];
}
```

#### 1.3 Branch Store ✅
**Current**: Basic branch management  
**Missing**: QR code generation, branch stats

```typescript
// Add to branch-store.ts
interface BranchSlice {
  // ... existing state
  generateQRCode: (branchId: string) => Promise<string>;
  getBranchStats: (branchId: string) => Promise<BranchStats>;
}
```

#### 1.4 Staff Store ✅
**Current**: Basic staff management  
**Missing**: Performance tracking, role management

```typescript
// Add to staff-store.ts
interface StaffSlice {
  // ... existing state
  updatePermissions: (memberId: string, permissions: Permission[]) => Promise<void>;
  getStaffPerformance: (memberId: string) => Promise<PerformanceMetrics>;
}
```

### Phase 2: Create Missing Stores (Priority: HIGH)

#### 2.1 Billing Store
**File**: `src/stores/billing-store.ts`

```typescript
interface BillingState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  nextBillingDate: Date | null;
  invoices: Invoice[];
  usage: UsageStats;
  isLoading: boolean;
  error: string | null;
}

interface BillingSlice {
  // State
  ...BillingState;
  
  // CRUD
  fetchSubscription: () => Promise<void>;
  upgradePlan: (plan: SubscriptionPlan) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  
  // Invoices
  fetchInvoices: () => Promise<void>;
  downloadInvoice: (invoiceId: string) => Promise<void>;
  payInvoice: (invoiceId: string) => Promise<void>;
  
  // Usage
  fetchUsage: () => Promise<void>;
  getUsageStats: () => UsageStats;
}
```

#### 2.2 Balance Store
**File**: `src/stores/balance-store.ts`

```typescript
interface BalanceState {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  transactions: BalanceTransaction[];
  withdrawals: Withdrawal[];
  isLoading: boolean;
  error: string | null;
}

interface BalanceSlice {
  // State
  ...BalanceState;
  
  // Balance
  fetchBalance: () => Promise<void>;
  
  // Transactions
  fetchTransactions: (limit?: number) => Promise<void>;
  
  // Withdrawals
  requestWithdrawal: (data: WithdrawalRequest) => Promise<void>;
  fetchWithdrawals: () => Promise<void>;
  cancelWithdrawal: (id: string) => Promise<void>;
}
```

#### 2.3 Member Packages Store
**File**: `src/stores/member-packages-store.ts`

```typescript
interface MemberPackagesState {
  packages: MemberPackage[];
  subscriptions: MemberSubscription[];
  tiers: MembershipTier[];
  isLoading: boolean;
  error: string | null;
}

interface MemberPackagesSlice {
  // Packages CRUD
  fetchPackages: () => Promise<void>;
  createPackage: (data: CreatePackageData) => Promise<void>;
  updatePackage: (id: string, data: UpdatePackageData) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  
  // Subscriptions CRUD
  fetchSubscriptions: () => Promise<void>;
  createSubscription: (data: CreateSubscriptionData) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  renewSubscription: (id: string) => Promise<void>;
  
  // Tiers
  fetchTiers: () => Promise<void>;
  applyPackage: (packageId: string) => Promise<void>;
}
```

#### 2.4 Coupons Store (merge with Loyalty)
**Enhance**: `src/stores/loyalty-store.ts`

```typescript
interface LoyaltySlice {
  // ... existing state
  // Coupons CRUD
  fetchCoupons: () => Promise<void>;
  createCoupon: (data: CreateCouponData) => Promise<void>;
  updateCoupon: (id: string, data: UpdateCouponData) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<DiscountResult>;
  
  // Loyalty
  fetchTiers: () => Promise<void>;
  updateTier: (id: string, data: UpdateTierData) => Promise<void>;
}
```

### Phase 3: Update Reports & Analytics (Priority: MEDIUM)

#### 3.1 Reports Store Enhancement
**Enhance**: `src/stores/reports-store.ts`

```typescript
interface ReportsSlice {
  // ... existing state
  // Reports
  fetchRevenueReport: (params: ReportParams) => Promise<RevenueReport>;
  fetchTaxReport: (params: TaxReportParams) => Promise<TaxReport>;
  fetchOrderReport: (params: ReportParams) => Promise<OrderReport>;
  
  // Export
  exportToPDF: (reportType: string, data: any) => Promise<void>;
  exportToExcel: (reportType: string, data: any) => Promise<void>;
  
  // Analytics
  getTrends: (period: string) => Promise<Trends>;
  getComparisons: (currentPeriod: string, previousPeriod: string) => Promise<Comparison>;
}
```

### Phase 4: Update All Pages (Priority: MEDIUM)

#### Migration Pattern

**Before** (using hooks):
```typescript
import { useOrders } from '@/hooks/use-orders';

function OrdersPage() {
  const { orders, isLoading, createOrder, updateOrder } = useOrders();
  // ...
}
```

**After** (using Zustand):
```typescript
import { useOrderStore } from '@/stores/order-store';

function OrdersPage() {
  const { 
    orders, 
    isLoading, 
    fetchAll, 
    create, 
    update,
    delete: remove 
  } = useOrderStore();
  
  useEffect(() => {
    fetchAll();
  }, []);
  // ...
}
```

---

## 🔧 Implementation Guidelines

### 1. Store Pattern

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface State {
  // State fields
}

interface Actions {
  // Actions
}

export const useEntityStore = create<State & Actions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        entities: [],
        isLoading: false,
        error: null,
        
        // Actions
        fetchAll: async (params) => {
          set({ isLoading: true });
          try {
            const response = await fetch(`/api/entities?${params}`);
            const data = await response.json();
            set({ entities: data, isLoading: false });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },
        
        // ... more actions
      }),
      { name: 'entity-store' }
    )
  )
);
```

### 2. API Integration

```typescript
// Use consistent API calls
const api = {
  get: async <T>(url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
  
  post: async <T, D>(url: string, data: D) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
  
  // ... put, delete
};
```

### 3. Error Handling

```typescript
try {
  await action();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Operation failed';
  set({ error: message });
  // Show toast notification
  toast.error(message);
}
```

---

## 📊 Migration Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|---------------|----------|
| Phase 1 | Enhance existing stores | 2 hours | HIGH |
| Phase 2 | Create missing stores | 3 hours | HIGH |
| Phase 3 | Update reports & analytics | 2 hours | MEDIUM |
| Phase 4 | Update all pages | 4 hours | MEDIUM |
| Phase 5 | Testing & bug fixes | 3 hours | HIGH |
| Phase 6 | Remove deprecated hooks | 1 hour | LOW |

**Total**: ~15 hours

---

## ✅ Success Criteria

1. ✅ All CRUD operations use Zustand stores
2. ✅ No direct `fetch()` calls in components
3. ✅ Consistent error handling across all stores
4. ✅ Loading states managed by Zustand
5. ✅ All stores have devtools enabled
6. ✅ Persistent stores use localStorage appropriately
7. ✅ TypeScript types are consistent
8. ✅ All pages work correctly after migration

---

## 📚 References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand Slices Pattern](https://github.com/pmndrs/zustand#slices-pattern)
- [Zustand TypeScript Guide](https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/advanced-typescript.md)
- [Context7 Zustand Docs](https://context7.com/pmndrs/zustand)

---

**Next Steps**:
1. Review and approve this migration plan
2. Start with Phase 1 (enhance existing stores)
3. Proceed to Phase 2 (create missing stores)
4. Migrate pages incrementally
5. Test thoroughly before removing hooks
