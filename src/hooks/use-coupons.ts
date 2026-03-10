import { useState, useCallback } from "react";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  scope: "all" | "category" | "service";
  category: string | null;
  serviceId: string | null;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
}

interface UseCouponsReturn {
  coupons: Coupon[];
  isLoading: boolean;
  error: string | null;
  fetchCoupons: () => Promise<void>;
  createCoupon: (data: Partial<Coupon>) => Promise<Coupon | null>;
  updateCoupon: (id: string, data: Partial<Coupon>) => Promise<Coupon | null>;
  deleteCoupon: (id: string) => Promise<boolean>;
  applyCoupon: (code: string, orderAmount: number, options?: {
    customerPhone?: string;
    serviceCategory?: string;
    serviceId?: string;
  }) => Promise<{ success: boolean; discount: number; coupon?: Coupon }>;
}

export function useCoupons(): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/coupons");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch coupons");
      }
      
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch coupons");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCoupon = useCallback(async (data: Partial<Coupon>): Promise<Coupon | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to create coupon");
      }
      
      await fetchCoupons();
      return result.coupon;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create coupon");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCoupons]);

  const updateCoupon = useCallback(async (id: string, data: Partial<Coupon>): Promise<Coupon | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update coupon");
      }
      
      await fetchCoupons();
      return result.coupon;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coupon");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCoupons]);

  const deleteCoupon = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/coupons?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete coupon");
      }
      
      await fetchCoupons();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete coupon");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCoupons]);

  const applyCoupon = useCallback(async (
    code: string,
    orderAmount: number,
    options?: {
      customerPhone?: string;
      serviceCategory?: string;
      serviceId?: string;
    }
  ): Promise<{ success: boolean; discount: number; coupon?: Coupon }> => {
    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          orderAmount,
          ...options,
        }),
      });
      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, discount: 0, coupon: undefined };
      }
      
      return {
        success: true,
        discount: result.discount,
        coupon: result.coupon,
      };
    } catch {
      return { success: false, discount: 0, coupon: undefined };
    }
  }, []);

  return {
    coupons,
    isLoading,
    error,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    applyCoupon,
  };
}
