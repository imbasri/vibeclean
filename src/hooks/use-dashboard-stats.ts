import { useState, useEffect, useCallback } from "react";

// Types
interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  readyOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  newCustomers: number;
}

interface Trend {
  value: number;
  isPositive: boolean;
}

interface DashboardTrends {
  revenue: Trend;
  orders: Trend;
  completed: Trend;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: Date;
}

interface DashboardStatsResponse {
  stats: DashboardStats;
  trends: DashboardTrends;
  recentOrders: RecentOrder[];
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface UseDashboardStatsOptions {
  branchId?: string;
  period?: "day" | "week" | "month" | "year";
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  trends: DashboardTrends | null;
  recentOrders: RecentOrder[];
  isLoading: boolean;
  error: string | null;
  period: string;
  refetch: () => Promise<void>;
}

export function useDashboardStats(
  options: UseDashboardStatsOptions = {}
): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<DashboardTrends | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("month");

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.branchId) params.set("branchId", options.branchId);
      if (options.period) params.set("period", options.period);

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dashboard stats");
      }

      const data: DashboardStatsResponse = await response.json();

      setStats(data.stats);
      setTrends(data.trends);
      setPeriod(data.period);

      // Parse dates for recent orders
      const ordersWithDates = data.recentOrders.map((order) => ({
        ...order,
        createdAt: new Date(order.createdAt),
      }));
      setRecentOrders(ordersWithDates);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch dashboard stats";
      setError(message);
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.branchId, options.period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    trends,
    recentOrders,
    isLoading,
    error,
    period,
    refetch: fetchStats,
  };
}
