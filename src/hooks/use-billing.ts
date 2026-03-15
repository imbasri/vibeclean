import { useState, useEffect, useCallback } from "react";
import type { SubscriptionPlan } from "@/types";

// Types
export interface UsageItem {
  used: number;
  limit: number | "Unlimited";
  percentage: number;
}

export interface BillingUsage {
  branches: UsageItem;
  staff: UsageItem;
  orders: UsageItem;
}

export interface BillingSubscription {
  plan: SubscriptionPlan;
  status: "active" | "trial" | "expired" | "cancelled";
  price: number;
  nextBillingDate: string;
  daysUntilRenewal: number;
  trialEndsAt: string | null;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber?: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  plan: string;
  billingCycle?: string;
  periodStart?: string;
  periodEnd?: string;
  paidAt?: string;
  paymentUrl?: string;
}

export interface BillingData {
  subscription: BillingSubscription;
  usage: BillingUsage;
  invoices: BillingInvoice[];
  organization: {
    id: string;
    name: string;
  };
}

export interface SubscribeResult {
  success: boolean;
  requiresPayment?: boolean;
  paymentUrl?: string;
  invoiceNumber?: string;
  amount?: number;
  message?: string;
  error?: string;
}

interface UseBillingReturn {
  data: BillingData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  upgradePlan: (plan: SubscriptionPlan) => Promise<{ success: boolean; error?: string }>;
  subscribeToPlan: (
    plan: SubscriptionPlan,
    billingCycle?: "monthly" | "yearly"
  ) => Promise<SubscribeResult>;
  isUpgrading: boolean;
  isSubscribing: boolean;
}

export function useBilling(): UseBillingReturn {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/billing", { credentials: "include" });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch billing info");
      }

      const billingData: BillingData = await response.json();
      setData(billingData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch billing info";
      setError(message);
      console.error("Error fetching billing:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upgradePlan = useCallback(
    async (plan: SubscriptionPlan): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsUpgrading(true);

        const response = await fetch("/api/billing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ plan }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to upgrade subscription");
        }

        // Refetch billing data after successful upgrade
        await fetchBilling();

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to upgrade subscription";
        console.error("Error upgrading subscription:", err);
        return { success: false, error: message };
      } finally {
        setIsUpgrading(false);
      }
    },
    [fetchBilling]
  );

  /**
   * Subscribe to a plan using Mayar payment
   * Returns payment URL if payment is required, or success if plan is free
   */
  const subscribeToPlan = useCallback(
    async (
      plan: SubscriptionPlan,
      billingCycle: "monthly" | "yearly" = "monthly"
    ): Promise<SubscribeResult> => {
      try {
        setIsSubscribing(true);

        const response = await fetch("/api/billing/subscribe", { credentials: "include", 
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan, billingCycle }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to subscribe");
        }

        // If payment is required, return the payment URL
        if (result.requiresPayment && result.paymentUrl) {
          return {
            success: true,
            requiresPayment: true,
            paymentUrl: result.paymentUrl,
            invoiceNumber: result.invoiceNumber,
            amount: result.amount,
            message: result.message,
          };
        }

        // If no payment required (free plan), refetch billing data
        await fetchBilling();

        return {
          success: true,
          requiresPayment: false,
          message: result.message,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to subscribe";
        console.error("Error subscribing:", err);
        return { success: false, error: message };
      } finally {
        setIsSubscribing(false);
      }
    },
    [fetchBilling]
  );

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBilling,
    upgradePlan,
    subscribeToPlan,
    isUpgrading,
    isSubscribing,
  };
}
