import { create } from 'zustand';

interface StatsData {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  todayOrders: number;
  todayRevenue: number;
  totalCustomers: number;
  totalServices: number;
}

interface StatsState {
  stats: StatsData;
  lastUpdated: Date | null;
  isLoading: boolean;
  
  // Actions
  fetchStats: () => Promise<void>;
  updateOrderStats: (order: any, action: 'create' | 'update' | 'delete') => void;
  updateCustomerStats: (customer: any, action: 'create' | 'update' | 'delete') => void;
  refreshStats: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  stats: {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
    totalCustomers: 0,
    totalServices: 0,
  },
  lastUpdated: null,
  isLoading: false,

  fetchStats: async () => {
    set({ isLoading: true });
    try {
      // Fetch from multiple endpoints
      const [ordersRes, customersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/customers'),
      ]);

      const orders = await ordersRes.json();
      const customers = await customersRes.json();

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= today;
      });

      const totalRevenue = orders.reduce((sum: number, o: any) => {
        const isPaid = o.paymentStatus === 'paid' || 
                      (o.paymentMethod === 'cash' && o.paymentStatus !== 'unpaid');
        return sum + (isPaid ? Number(o.total) : 0);
      }, 0);

      const todayRevenue = todayOrders.reduce((sum: number, o: any) => {
        const isPaid = o.paymentStatus === 'paid' || 
                      (o.paymentMethod === 'cash' && o.paymentStatus !== 'unpaid');
        return sum + (isPaid ? Number(o.total) : 0);
      }, 0);

      set({
        stats: {
          totalOrders: orders.length,
          totalRevenue,
          pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
          completedOrders: orders.filter((o: any) => o.status === 'completed').length,
          todayOrders: todayOrders.length,
          todayRevenue,
          totalCustomers: customers.length,
          totalServices: 0, // Will be updated separately
        },
        lastUpdated: new Date(),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      set({ isLoading: false });
    }
  },

  updateOrderStats: (order, action) => {
    set((state) => {
      const newStats = { ...state.stats };

      if (action === 'create') {
        newStats.totalOrders += 1;
        const isPaid = order.paymentStatus === 'paid' || 
                      (order.paymentMethod === 'cash' && order.paymentStatus !== 'unpaid');
        if (isPaid) {
          newStats.totalRevenue += Number(order.total);
          const orderDate = new Date(order.createdAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (orderDate >= today) {
            newStats.todayOrders += 1;
            newStats.todayRevenue += Number(order.total);
          }
        }
      } else if (action === 'delete') {
        newStats.totalOrders -= 1;
        const isPaid = order.paymentStatus === 'paid' || 
                      (order.paymentMethod === 'cash' && order.paymentStatus !== 'unpaid');
        if (isPaid) {
          newStats.totalRevenue -= Number(order.total);
          const orderDate = new Date(order.createdAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (orderDate >= today) {
            newStats.todayOrders -= 1;
            newStats.todayRevenue -= Number(order.total);
          }
        }
      } else if (action === 'update') {
        // Recalculate everything on update
        get().fetchStats();
        return state;
      }

      return { stats: newStats, lastUpdated: new Date() };
    });
  },

  updateCustomerStats: (customer, action) => {
    set((state) => {
      const newStats = { ...state.stats };

      if (action === 'create') {
        newStats.totalCustomers += 1;
      } else if (action === 'delete') {
        newStats.totalCustomers -= 1;
      }

      return { stats: newStats, lastUpdated: new Date() };
    });
  },

  refreshStats: async () => {
    await get().fetchStats();
  },
}));
