import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types';

// ============================================
// TYPES
// ============================================

export interface Invoice {
  id: string;
  organizationId: string;
  plan: SubscriptionPlan;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  paymentLink?: string;
  createdAt: Date;
}

export interface UsageStats {
  ordersUsed: number;
  ordersLimit: number;
  branchesUsed: number;
  branchesLimit: number;
  staffUsed: number;
  staffLimit: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SubscriptionData {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  nextBillingDate: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// ============================================
// STATE INTERFACE
// ============================================

interface BillingState {
  // Subscription
  subscription: SubscriptionData | null;
  
  // Invoices
  invoices: Invoice[];
  
  // Usage
  usage: UsageStats | null;
  
  // UI State
  isLoading: boolean;
  isUpgrading: boolean;
  error: string | null;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface BillingActions {
  // Subscription
  fetchSubscription: () => Promise<void>;
  upgradePlan: (plan: SubscriptionPlan) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  activateSubscription: (invoiceId: string) => Promise<void>;
  
  // Invoices
  fetchInvoices: () => Promise<void>;
  getInvoiceById: (invoiceId: string) => Promise<Invoice>;
  downloadInvoice: (invoiceId: string) => Promise<void>;
  getPaymentLink: (invoiceId: string) => Promise<string>;
  confirmPayment: (invoiceId: string) => Promise<void>;
  
  // Usage
  fetchUsage: () => Promise<void>;
  getUsagePercentage: () => {
    orders: number;
    branches: number;
    staff: number;
  };
  
  // Local actions
  clearError: () => void;
  reset: () => void;
}

// ============================================
// STORE TYPE
// ============================================

type BillingStore = BillingState & BillingActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: BillingState = {
  subscription: null,
  invoices: [],
  usage: null,
  isLoading: false,
  isUpgrading: false,
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
};

// ============================================
// STORE
// ============================================

export const useBillingStore = create<BillingStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // ============================================
      // SUBSCRIPTION ACTIONS
      // ============================================
      
      fetchSubscription: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<SubscriptionData>('/api/billing');
          set({ subscription: data, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
          set({ error: message, isLoading: false });
        }
      },
      
      upgradePlan: async (plan: SubscriptionPlan) => {
        set({ isUpgrading: true, error: null });
        try {
          const data = await api.post<{ paymentLink: string }>('/api/billing/subscribe', { plan });
          // Redirect to payment link
          if (data.paymentLink) {
            window.open(data.paymentLink, '_blank');
          }
          set({ isUpgrading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to upgrade plan';
          set({ error: message, isUpgrading: false });
          throw error;
        }
      },
      
      cancelSubscription: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/billing/cancel');
          // Refetch subscription
          await get().fetchSubscription();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
          set({ error: message, isLoading: false });
        }
      },
      
      activateSubscription: async (invoiceId: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(`/api/billing/invoice/${invoiceId}/force-activate`);
          await get().fetchSubscription();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to activate subscription';
          set({ error: message, isLoading: false });
        }
      },
      
      // ============================================
      // INVOICE ACTIONS
      // ============================================
      
      fetchInvoices: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<{ invoices: Invoice[] }>('/api/billing');
          set({ invoices: data.invoices, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
          set({ error: message, isLoading: false });
        }
      },
      
      getInvoiceById: async (invoiceId: string) => {
        try {
          const data = await api.get<Invoice>(`/api/billing/invoice/${invoiceId}`);
          return data;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch invoice';
          set({ error: message });
          throw error;
        }
      },
      
      downloadInvoice: async (invoiceId: string) => {
        try {
          const response = await fetch(`/api/billing/invoice/${invoiceId}/download`, {
            credentials: 'include',
          });
          
          if (!response.ok) throw new Error('Failed to download invoice');
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${invoiceId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to download invoice';
          set({ error: message });
          throw error;
        }
      },
      
      getPaymentLink: async (invoiceId: string) => {
        try {
          const data = await api.post<{ paymentLink: string }>(
            `/api/billing/invoice/${invoiceId}/payment-link`
          );
          return data.paymentLink;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to get payment link';
          set({ error: message });
          throw error;
        }
      },
      
      confirmPayment: async (invoiceId: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post(`/api/billing/invoice/${invoiceId}/confirm-payment`);
          await get().fetchInvoices();
          await get().fetchSubscription();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to confirm payment';
          set({ error: message, isLoading: false });
        }
      },
      
      // ============================================
      // USAGE ACTIONS
      // ============================================
      
      fetchUsage: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<UsageStats>('/api/billing/usage');
          set({ usage: data, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch usage';
          set({ error: message, isLoading: false });
        }
      },
      
      getUsagePercentage: () => {
        const { usage } = get();
        if (!usage) return { orders: 0, branches: 0, staff: 0 };
        
        return {
          orders: usage.ordersLimit > 0 ? (usage.ordersUsed / usage.ordersLimit) * 100 : 0,
          branches: usage.branchesLimit > 0 ? (usage.branchesUsed / usage.branchesLimit) * 100 : 0,
          staff: usage.staffLimit > 0 ? (usage.staffUsed / usage.staffLimit) * 100 : 0,
        };
      },
      
      // ============================================
      // LOCAL ACTIONS
      // ============================================
      
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'billing-store',
    }
  )
);
