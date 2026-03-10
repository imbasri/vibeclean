import { useState, useEffect, useCallback } from "react";
import type { SubscriptionPlan } from "@/types";

// ============================================
// TYPES
// ============================================

export interface UsageItem {
  used: number;
  limit: number | "Unlimited";
  percentage: number;
  remaining: number | "Unlimited";
}

export interface SubscriptionUsage {
  branches: UsageItem;
  staff: UsageItem;
  orders: UsageItem;
}

export interface UsageWarning {
  type: "branches" | "staff" | "orders";
  message: string;
}

export interface UsageLimits {
  canCreateOrder: boolean;
  canCreateBranch: boolean;
  isUnlimited: boolean;
}

export interface SubscriptionUsageData {
  plan: SubscriptionPlan;
  usage: SubscriptionUsage;
  warnings: UsageWarning[];
  limits: UsageLimits;
  period: {
    start: string;
    end: string;
  };
}

interface UseSubscriptionReturn {
  data: SubscriptionUsageData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  canCreateOrder: boolean;
  canCreateBranch: boolean;
  incrementOrderCount: () => Promise<{ success: boolean; limitReached?: boolean; warning?: string }>;
  isAtOrderLimit: boolean;
  isNearOrderLimit: boolean;
  orderLimitPercentage: number;
}

// ============================================
// HOOK
// ============================================

export function useSubscription(): UseSubscriptionReturn {
  const [data, setData] = useState<SubscriptionUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing/usage");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch usage");
      }

      const usageData: SubscriptionUsageData = await response.json();
      setData(usageData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch usage";
      setError(message);
      console.error("Error fetching subscription usage:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const incrementOrderCount = useCallback(async (): Promise<{
    success: boolean;
    limitReached?: boolean;
    warning?: string;
  }> => {
    try {
      const response = await fetch("/api/billing/usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "increment_order" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to increment order count");
      }

      // Refetch usage after incrementing
      await fetchUsage();

      return {
        success: true,
        limitReached: result.limitReached,
        warning: result.warning,
      };
    } catch (err) {
      console.error("Error incrementing order count:", err);
      return { success: false };
    }
  }, [fetchUsage]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Derived values
  const canCreateOrder = data?.limits.canCreateOrder ?? true;
  const canCreateBranch = data?.limits.canCreateBranch ?? true;
  const orderLimitPercentage = data?.usage.orders.percentage ?? 0;
  const isAtOrderLimit = orderLimitPercentage >= 100;
  const isNearOrderLimit = orderLimitPercentage >= 80 && orderLimitPercentage < 100;

  return {
    data,
    isLoading,
    error,
    refetch: fetchUsage,
    canCreateOrder,
    canCreateBranch,
    incrementOrderCount,
    isAtOrderLimit,
    isNearOrderLimit,
    orderLimitPercentage,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if organization can perform an action based on subscription
 */
export async function checkSubscriptionLimit(
  action: "create_order" | "create_branch"
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const response = await fetch("/api/billing/usage");
    
    if (!response.ok) {
      // If we can't fetch, allow the action (fail open)
      return { allowed: true };
    }

    const data: SubscriptionUsageData = await response.json();

    if (action === "create_order" && !data.limits.canCreateOrder) {
      return {
        allowed: false,
        message: "Kuota transaksi bulan ini sudah habis. Upgrade ke Pro untuk transaksi unlimited.",
      };
    }

    if (action === "create_branch" && !data.limits.canCreateBranch) {
      return {
        allowed: false,
        message: "Batas cabang sudah tercapai. Upgrade paket untuk menambah cabang.",
      };
    }

    return { allowed: true };
  } catch {
    // Fail open on error
    return { allowed: true };
  }
}

/**
 * Get human-readable plan name
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  const names: Record<SubscriptionPlan, string> = {
    starter: "Starter (Gratis)",
    pro: "Pro",
    enterprise: "Enterprise",
  };
  return names[plan] || plan;
}

/**
 * Get plan color for badges
 */
export function getPlanColor(plan: SubscriptionPlan): string {
  const colors: Record<SubscriptionPlan, string> = {
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
    enterprise: "bg-amber-100 text-amber-700",
  };
  return colors[plan] || "bg-gray-100 text-gray-700";
}
