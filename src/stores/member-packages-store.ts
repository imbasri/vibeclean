import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface MemberPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  benefits: string[];
  transactionLimit: number;
  discountPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberSubscription {
  id: string;
  customerId: string;
  customerName: string;
  packageId: string;
  packageName: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date;
  nextBillingDate?: Date;
  autoRenew: boolean;
  createdAt: Date;
}

export interface MembershipTier {
  id: string;
  name: string;
  level: number;
  minPoints: number;
  benefits: string[];
  discountPercent: number;
  color: string;
  icon?: string;
}

// ============================================
// STATE INTERFACE
// ============================================

interface MemberPackagesState {
  // Packages
  packages: MemberPackage[];
  
  // Subscriptions
  subscriptions: MemberSubscription[];
  
  // Tiers
  tiers: MembershipTier[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface MemberPackagesActions {
  // Packages CRUD
  fetchPackages: () => Promise<void>;
  createPackage: (data: CreatePackageData) => Promise<void>;
  updatePackage: (id: string, data: UpdatePackageData) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  togglePackageStatus: (id: string) => Promise<void>;
  
  // Subscriptions CRUD
  fetchSubscriptions: () => Promise<void>;
  createSubscription: (data: CreateSubscriptionData) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  renewSubscription: (id: string) => Promise<void>;
  getCustomerSubscriptions: (customerId: string) => Promise<MemberSubscription[]>;
  
  // Tiers
  fetchTiers: () => Promise<void>;
  updateTier: (id: string, data: UpdateTierData) => Promise<void>;
  
  // Apply package
  applyPackage: (packageId: string, customerId: string) => Promise<void>;
  
  // Local actions
  getPackageById: (id: string) => MemberPackage | undefined;
  clearError: () => void;
  reset: () => void;
}

export interface CreatePackageData {
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  benefits: string[];
  transactionLimit: number;
  discountPercent: number;
}

export interface UpdatePackageData {
  name?: string;
  description?: string;
  price?: number;
  benefits?: string[];
  transactionLimit?: number;
  discountPercent?: number;
  isActive?: boolean;
}

export interface CreateSubscriptionData {
  customerId: string;
  packageId: string;
  autoRenew?: boolean;
}

export interface UpdateTierData {
  name?: string;
  benefits?: string[];
  discountPercent?: number;
  color?: string;
  minPoints?: number;
}

// ============================================
// STORE TYPE
// ============================================

type MemberPackagesStore = MemberPackagesState & MemberPackagesActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: MemberPackagesState = {
  packages: [],
  subscriptions: [],
  tiers: [],
  isLoading: false,
  error: null,
};

// ============================================
// API HELPERS
// ============================================

const api = {
  get: async <T>(url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Request failed');
    }
    return res.json() as T;
  },
  
  post: async <T, D = unknown>(url: string, data?: D) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Request failed');
    }
    return res.json() as T;
  },
  
  put: async <T, D = unknown>(url: string, data?: D) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Request failed');
    }
    return res.json() as T;
  },
  
  delete: async (url: string) => {
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Request failed');
    }
    return res.json();
  },
};

// ============================================
// STORE
// ============================================

export const useMemberPackagesStore = create<MemberPackagesStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // ============================================
      // PACKAGES CRUD ACTIONS
      // ============================================
      
      fetchPackages: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ packages: MemberPackage[] }>('/api/member-packages');
          // Parse dates
          const packages = data.packages.map(p => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }));
          set({ packages, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch packages';
          set({ error: message, isLoading: false });
        }
      },
      
      createPackage: async (data: CreatePackageData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/member-packages', data);
          await get().fetchPackages();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create package';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      updatePackage: async (id: string, data: UpdatePackageData) => {
        set({ isLoading: true, error: null });
        try {
          await api.put(`/api/member-packages/${id}`, data);
          await get().fetchPackages();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update package';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      deletePackage: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.delete(`/api/member-packages/${id}`);
          await get().fetchPackages();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete package';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      togglePackageStatus: async (id: string) => {
        const pkg = get().packages.find(p => p.id === id);
        if (!pkg) return;
        
        await get().updatePackage(id, { isActive: !pkg.isActive });
      },
      
      // ============================================
      // SUBSCRIPTIONS CRUD ACTIONS
      // ============================================
      
      fetchSubscriptions: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ subscriptions: MemberSubscription[] }>(
            '/api/member-packages/subscriptions'
          );
          // Parse dates
          const subscriptions = data.subscriptions.map(s => ({
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            nextBillingDate: s.nextBillingDate ? new Date(s.nextBillingDate) : undefined,
          }));
          set({ subscriptions, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch subscriptions';
          set({ error: message, isLoading: false });
        }
      },
      
      createSubscription: async (data: CreateSubscriptionData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/member-packages/subscriptions', data);
          await get().fetchSubscriptions();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create subscription';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      cancelSubscription: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(`/api/member-packages/subscriptions/${id}/cancel`);
          await get().fetchSubscriptions();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      renewSubscription: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(`/api/member-packages/subscriptions/${id}/renew`);
          await get().fetchSubscriptions();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to renew subscription';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      getCustomerSubscriptions: async (customerId: string) => {
        try {
          const data = await api.get<{ subscriptions: MemberSubscription[] }>(
            `/api/member-packages/subscriptions?customerId=${customerId}`
          );
          return data.subscriptions.map(s => ({
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            nextBillingDate: s.nextBillingDate ? new Date(s.nextBillingDate) : undefined,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch customer subscriptions';
          set({ error: message });
          throw error;
        }
      },
      
      // ============================================
      // TIERS ACTIONS
      // ============================================
      
      fetchTiers: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ tiers: MembershipTier[] }>('/api/loyalty/tiers');
          set({ tiers: data.tiers, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch tiers';
          set({ error: message, isLoading: false });
        }
      },
      
      updateTier: async (id: string, data: UpdateTierData) => {
        set({ isLoading: true, error: null });
        try {
          await api.put(`/api/loyalty/tiers/${id}`, data);
          await get().fetchTiers();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update tier';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      // ============================================
      // APPLY PACKAGE
      // ============================================
      
      applyPackage: async (packageId: string, customerId: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/member-packages/apply', {
            packageId,
            customerId,
          });
          await get().fetchSubscriptions();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to apply package';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      // ============================================
      // LOCAL ACTIONS
      // ============================================
      
      getPackageById: (id: string) => {
        return get().packages.find(p => p.id === id);
      },
      
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'member-packages-store',
    }
  )
);
