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
  starter: { branches: 1, staff: 3, orders: 100 }, // Starter: 1 branch, 3 staff, 100 orders/month
  pro: { branches: 5, staff: 10, orders: -1 }, // Pro: 5 branches, 10 staff, unlimited orders
  enterprise: { branches: -1, staff: -1, orders: -1 }, // Enterprise: unlimited everything
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

    // ============================================
    // BASIC FEATURES - ALL PLANS (Including Starter)
    // ============================================
    // These are core business features every laundry needs
    if (feature === 'dashboard') return true; // All plans get dashboard
    if (feature === 'pos') return true; // POS is core feature
    if (feature === 'orders') return true; // Order management is essential
    if (feature === 'services') return true; // Service management
    if (feature === 'customers') return true; // Customer database
    if (feature === 'settings') return true; // Basic settings
    if (feature === 'billing') return true; // All plans need billing access (to upgrade/manage)
    if (feature === 'balance') return true; // Balance & withdrawals for all
    
    // Member & Loyalty features - Available for ALL plans
    // This helps small businesses grow with customer retention
    if (feature === 'members') return true; // Member packages (all plans)
    if (feature === 'loyalty') return true; // Loyalty coupons (all plans)
    if (feature === 'discounts') return true; // Discount management (all plans)
    
    // ============================================
    // PRO FEATURES (Starter: ❌ | Pro/Enterprise: ✅)
    // ============================================
    // Advanced business management features
    if (feature === 'branches') {
      // Multi-branch management (Starter limited to 1 branch)
      return plan === 'pro' || plan === 'enterprise';
    }
    if (feature === 'staff') {
      // Staff management with roles (Starter has basic staff limit)
      return plan === 'pro' || plan === 'enterprise';
    }
    if (feature === 'reports') {
      // Advanced analytics & reports
      return plan === 'pro' || plan === 'enterprise';
    }
    
    // ============================================
    // ENTERPRISE FEATURES (Starter/Pro: ❌ | Enterprise: ✅)
    // ============================================
    // Premium features for large-scale operations
    if (feature === 'analytics') {
      // Advanced business intelligence
      return plan === 'enterprise';
    }
    if (feature === 'custom-domain') {
      // White-label custom domain
      return plan === 'enterprise';
    }
    if (feature === 'api-access') {
      // API access for integrations
      return plan === 'enterprise';
    }
    if (feature === 'priority-support') {
      // Priority WhatsApp/phone support
      return plan === 'enterprise';
    }

    // Default: allow access (for unknown features)
    return true;
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
