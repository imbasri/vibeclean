import { create } from 'zustand';
import type { SubscriptionPlan } from '@/types';

interface SubscriptionState {
  plan: SubscriptionPlan;
  status: 'active' | 'trial' | 'cancelled' | 'expired';
  nextBillingDate: Date | null;
  branchesLimit: number;
  staffLimit: number;
  orderLimit: number;
  isLoading: boolean;
  
  // Actions
  fetchSubscription: () => Promise<void>;
  updateSubscription: (data: Partial<SubscriptionState>) => void;
  canAccessFeature: (feature: string) => boolean;
  canAddBranch: () => boolean;
  canAddStaff: (currentCount: number) => boolean;
  canAddOrder: (currentCount: number) => boolean;
}

const PLAN_LIMITS: Record<SubscriptionPlan, { branches: number; staff: number; orders: number }> = {
  starter: { branches: 1, staff: 3, orders: 100 },
  pro: { branches: 5, staff: 10, orders: -1 }, // -1 = unlimited
  enterprise: { branches: -1, staff: -1, orders: -1 },
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'starter',
  status: 'trial',
  nextBillingDate: null,
  branchesLimit: 1,
  staffLimit: 3,
  orderLimit: 100,
  isLoading: false,

  fetchSubscription: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/billing');
      if (!response.ok) throw new Error('Failed to fetch subscription');
      const data = await response.json();
      
      const plan = (data.plan as SubscriptionPlan) || 'starter';
      const limits = PLAN_LIMITS[plan];
      
      set({
        plan,
        status: data.status || 'trial',
        nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null,
        branchesLimit: limits.branches,
        staffLimit: limits.staff,
        orderLimit: limits.orders,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      set({ isLoading: false });
    }
  },

  updateSubscription: (data) => {
    set((state) => {
      const newPlan = data.plan || state.plan;
      const limits = PLAN_LIMITS[newPlan];
      
      return {
        ...state,
        ...data,
        branchesLimit: limits.branches,
        staffLimit: limits.staff,
        orderLimit: limits.orders,
      };
    });
  },

  canAccessFeature: (feature) => {
    const { plan } = get();
    
    // Starter features
    if (feature === 'pos') return true;
    if (feature === 'orders') return true;
    if (feature === 'customers') return true;
    if (feature === 'services') return true;
    if (feature === 'reports') return true;
    
    // Pro features
    if (feature === 'branches') {
      return plan === 'pro' || plan === 'enterprise';
    }
    if (feature === 'staff') {
      return plan === 'pro' || plan === 'enterprise';
    }
    if (feature === 'member-packages') {
      return plan === 'pro' || plan === 'enterprise';
    }
    if (feature === 'loyalty') {
      return plan === 'pro' || plan === 'enterprise';
    }
    
    // Enterprise features
    if (feature === 'analytics') {
      return plan === 'enterprise';
    }
    if (feature === 'custom-domain') {
      return plan === 'enterprise';
    }
    
    return false;
  },

  canAddBranch: () => {
    const { branchesLimit, status } = get();
    if (status !== 'active' && status !== 'trial') return false;
    if (branchesLimit === -1) return true; // Unlimited
    return true; // Will check actual count in component
  },

  canAddStaff: (currentCount) => {
    const { staffLimit, status } = get();
    if (status !== 'active' && status !== 'trial') return false;
    if (staffLimit === -1) return true; // Unlimited
    return currentCount < staffLimit;
  },

  canAddOrder: (currentCount) => {
    const { orderLimit, status } = get();
    if (status !== 'active' && status !== 'trial') return false;
    if (orderLimit === -1) return true; // Unlimited
    return currentCount < orderLimit;
  },
}));
