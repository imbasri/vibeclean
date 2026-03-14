import { create } from 'zustand';
import type { Order } from '@/types';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  todayRevenue: number;
}

interface OrderState {
  orders: Order[];
  stats: OrderStats;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchOrders: (filters?: any) => Promise<void>;
  fetchStats: () => Promise<void>;
  createOrder: (data: any) => Promise<Order | null>;
  updateOrder: (id: string, data: any) => Promise<boolean>;
  deleteOrder: (id: string) => Promise<boolean>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  stats: {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    todayRevenue: 0,
  },
  isLoading: false,
  error: null,

  fetchOrders: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams(filters || {});
      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      set({ orders: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
    }
  },

  fetchStats: async () => {
    try {
      const response = await fetch('/api/orders/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      set({ stats: data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  createOrder: async (data: any) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create order');
      const newOrder = await response.json();
      
      // Update local state
      set((state) => ({
        orders: [newOrder, ...state.orders],
      }));
      
      // Refresh stats
      get().refreshStats();
      
      return newOrder;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  updateOrder: async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update order');
      
      // Update local state
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? { ...o, ...data } : o)),
      }));
      
      // Refresh stats
      get().refreshStats();
      
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  deleteOrder: async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete order');
      
      // Update local state
      set((state) => ({
        orders: state.orders.filter((o) => o.id !== id),
      }));
      
      // Refresh stats
      get().refreshStats();
      
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  refreshStats: async () => {
    await get().fetchStats();
  },

  clearError: () => {
    set({ error: null });
  },
}));
