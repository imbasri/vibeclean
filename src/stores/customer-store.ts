import { create } from 'zustand';
import type { Customer } from '@/types';

interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  avgOrderValue: number;
  vipCustomers: number;
}

interface CustomerState {
  customers: Customer[];
  stats: CustomerStats;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCustomers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addCustomer: (data: any) => Promise<Customer | null>;
  updateCustomer: (id: string, data: any) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  searchCustomers: (query: string) => Promise<Customer[]>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  stats: {
    totalCustomers: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    vipCustomers: 0,
  },
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      set({ customers: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
    }
  },

  fetchStats: async () => {
    try {
      const response = await fetch('/api/customers/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      set({ stats: data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  addCustomer: async (data: any) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add customer');
      const newCustomer = await response.json();
      
      // Update local state
      set((state) => ({
        customers: [newCustomer, ...state.customers],
      }));
      
      // Refresh stats
      get().refreshStats();
      
      return newCustomer;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  updateCustomer: async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update customer');
      
      // Update local state
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }));
      
      // Refresh stats
      get().refreshStats();
      
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  deleteCustomer: async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete customer');
      
      // Update local state
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      }));
      
      // Refresh stats
      get().refreshStats();
      
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  searchCustomers: async (query: string) => {
    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      return data.customers || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },

  refreshStats: async () => {
    await get().fetchStats();
  },

  clearError: () => {
    set({ error: null });
  },
}));
