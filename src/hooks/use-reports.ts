import { useState, useEffect, useCallback } from "react";

// Types
export interface RevenueData {
  total: number;
  change: number;
  isPositive: boolean;
  daily: {
    day: string;
    amount: number;
    date: string;
  }[];
}

export interface OrderStatusItem {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface OrderStats {
  total: number;
  change: number;
  isPositive: boolean;
  byStatus: OrderStatusItem[];
}

export interface ServiceStat {
  name: string;
  orders: number;
  revenue: number;
  percentage: number;
}

export interface TopCustomer {
  name: string;
  orders: number;
  spent: number;
}

export interface CustomerStats {
  total: number;
  new: number;
  returning: number;
  newPercentage: number;
  topCustomers: TopCustomer[];
}

export interface BranchComparison {
  name: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface ReportsData {
  revenue: RevenueData;
  orders: OrderStats;
  services: ServiceStat[];
  customers: CustomerStats;
  branches: BranchComparison[];
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export type PeriodType = "today" | "week" | "month" | "year";

interface UseReportsOptions {
  branchId?: string;
  period?: PeriodType;
}

interface UseReportsReturn {
  data: ReportsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.branchId) params.set("branchId", options.branchId);
      if (options.period) params.set("period", options.period);

      const response = await fetch(`/api/reports?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch reports");
      }

      const reportData: ReportsData = await response.json();
      setData(reportData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch reports";
      setError(message);
      console.error("Error fetching reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.branchId, options.period]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchReports,
  };
}
