import { useState, useEffect, useCallback } from "react";

export interface MemberPackage {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  price: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxWeightKg: number | null;
  freePickupDelivery: boolean;
  maxTransactionsPerMonth: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberSubscription {
  id: string;
  organizationId: string;
  branchId: string | null;
  customerId: string;
  packageId: string;
  status: "active" | "expired" | "cancelled" | "paused";
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  transactionsThisMonth: number;
  lastTransactionReset: Date;
  notes: string | null;
  createdAt: Date;
  customerName: string;
  customerPhone: string;
  packageName: string;
  packagePrice: number;
  packageDiscountType: "percentage" | "fixed";
  packageDiscountValue: number;
}

export interface MemberDiscount {
  eligible: boolean;
  subscriptionId?: string;
  packageName?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  freePickupDelivery?: boolean;
  remainingTransactions?: number | null;
  message?: string;
  maxWeightKg?: number;
}

interface UseMemberPackagesReturn {
  packages: MemberPackage[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPackage: (data: Partial<MemberPackage>) => Promise<MemberPackage | null>;
  updatePackage: (id: string, data: Partial<MemberPackage>) => Promise<MemberPackage | null>;
  deletePackage: (id: string) => Promise<boolean>;
}

export function useMemberPackages(): UseMemberPackagesReturn {
  const [packages, setPackages] = useState<MemberPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/member-packages", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch packages");
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const createPackage = async (data: Partial<MemberPackage>): Promise<MemberPackage | null> => {
    try {
      const response = await fetch("/api/member-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create package");
      const newPackage = await response.json();
      setPackages((prev) => [newPackage, ...prev]);
      return newPackage;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const updatePackage = async (id: string, data: Partial<MemberPackage>): Promise<MemberPackage | null> => {
    try {
      const response = await fetch(`/api/member-packages/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update package");
      const updated = await response.json();
      setPackages((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const deletePackage = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/member-packages/${id}`, { credentials: "include", 
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete package");
      setPackages((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  };

  return {
    packages,
    isLoading,
    error,
    refetch: fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
  };
}

// ============================================
// HOOK: Member Subscriptions
// ============================================

interface UseMemberSubscriptionsReturn {
  subscriptions: MemberSubscription[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSubscription: (data: any) => Promise<MemberSubscription | null>;
  updateSubscription: (id: string, data: any) => Promise<boolean>;
  cancelSubscription: (id: string) => Promise<void>;
  renewSubscription: (id: string) => Promise<void>;
}

export function useMemberSubscriptions(status?: string): UseMemberSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = status 
        ? `/api/member-packages/subscriptions?status=${status}`
        : "/api/member-packages/subscriptions";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      const data = await response.json();
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const createSubscription = async (data: any): Promise<MemberSubscription | null> => {
    try {
      const response = await fetch("/api/member-packages/subscriptions", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create subscription");
      const newSub = await response.json();
      setSubscriptions((prev) => [newSub, ...prev]);
      return newSub;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const cancelSubscription = async (id: string) => {
    const response = await fetch(`/api/member-packages/subscriptions/${id}`, { credentials: "include", 
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!response.ok) throw new Error("Failed to cancel subscription");
    await fetchSubscriptions();
  };

  const renewSubscription = async (id: string) => {
    const response = await fetch(`/api/member-packages/subscriptions/${id}/renew`, { credentials: "include", 
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to renew subscription");
    await fetchSubscriptions();
  };

  return {
    subscriptions,
    isLoading,
    error,
    refetch: fetchSubscriptions,
    createSubscription,
    updateSubscription: async () => false,
    cancelSubscription,
    renewSubscription,
  };
}

// ============================================
// HOOK: Apply Member Discount
// ============================================

export async function applyMemberDiscount(
  customerId: string,
  branchId?: string,
  weight?: number
): Promise<MemberDiscount> {
  try {
    const response = await fetch("/api/member-packages/apply", { credentials: "include", 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, branchId, weight }),
    });
    return await response.json();
  } catch (error) {
    return { eligible: false, message: "Failed to check member discount" };
  }
}

export async function recordMemberTransaction(subscriptionId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/member-packages/apply", { credentials: "include", 
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
