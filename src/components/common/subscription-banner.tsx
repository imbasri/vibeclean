"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Crown, X, Zap, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription, getPlanDisplayName } from "@/hooks/use-subscription";

interface SubscriptionBannerProps {
  /** Show even if no warnings */
  alwaysShow?: boolean;
  /** Compact mode for sidebar */
  compact?: boolean;
}

export function SubscriptionBanner({ alwaysShow = false, compact = false }: SubscriptionBannerProps) {
  const { data, isLoading, isAtOrderLimit, isNearOrderLimit, orderLimitPercentage } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when warnings change
  useEffect(() => {
    if (isAtOrderLimit || isNearOrderLimit) {
      setDismissed(false);
    }
  }, [isAtOrderLimit, isNearOrderLimit]);

  if (isLoading || !data) return null;
  if (dismissed) return null;

  const { plan, usage, warnings } = data;

  // Don't show if no warnings and not alwaysShow
  if (!alwaysShow && warnings.length === 0) return null;

  // Starter plan at/near limit
  if (plan === "starter" && (isAtOrderLimit || isNearOrderLimit)) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            ${isAtOrderLimit 
              ? "bg-gradient-to-r from-red-500 to-red-600" 
              : "bg-gradient-to-r from-amber-500 to-amber-600"
            }
            text-white rounded-lg p-4 mb-4 relative
            ${compact ? "text-sm" : ""}
          `}
        >
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <AlertTriangle className={`${compact ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${compact ? "text-sm" : ""}`}>
                {isAtOrderLimit 
                  ? "Kuota Transaksi Habis!" 
                  : "Kuota Hampir Habis"
                }
              </p>
              <p className={`${compact ? "text-xs" : "text-sm"} opacity-90 mt-1`}>
                {isAtOrderLimit
                  ? "Upgrade ke Pro untuk transaksi unlimited."
                  : `${usage.orders.remaining} transaksi tersisa bulan ini.`
                }
              </p>

              {!compact && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Transaksi bulan ini</span>
                    <span>{usage.orders.used} / {usage.orders.limit}</span>
                  </div>
                  <Progress 
                    value={orderLimitPercentage} 
                    className="h-2 bg-white/30"
                  />
                </div>
              )}

              <Link href="/dashboard/billing">
                <Button 
                  size={compact ? "sm" : "default"}
                  className="mt-3 bg-white text-gray-900 hover:bg-gray-100"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade ke Pro
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Trial ending soon
  if (data.plan === "starter" && alwaysShow) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          bg-gradient-to-r from-blue-500 to-purple-600 
          text-white rounded-lg p-4 mb-4
          ${compact ? "text-sm" : ""}
        `}
      >
        <div className="flex items-start gap-3">
          <Zap className={`${compact ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`} />
          <div className="flex-1">
            <p className={`font-semibold ${compact ? "text-sm" : ""}`}>
              Paket {getPlanDisplayName(plan)}
            </p>
            <p className={`${compact ? "text-xs" : "text-sm"} opacity-90 mt-1`}>
              {usage.orders.used} dari {usage.orders.limit} transaksi bulan ini
            </p>
            
            {!compact && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>Upgrade untuk unlimited transaksi & fitur lebih lengkap</span>
              </div>
            )}

            <Link href="/dashboard/billing">
              <Button 
                size={compact ? "sm" : "default"}
                variant="secondary"
                className="mt-3"
              >
                Lihat Paket
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

// Compact version for sidebar
export function SubscriptionBadge() {
  const { data, isLoading, isAtOrderLimit, orderLimitPercentage } = useSubscription();

  if (isLoading || !data) return null;

  const { plan, usage } = data;

  if (plan === "pro" || plan === "enterprise") {
    return (
      <div className="px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">
            {getPlanDisplayName(plan)}
          </span>
        </div>
      </div>
    );
  }

  // Starter plan - show usage
  return (
    <Link href="/dashboard/billing" className="block">
      <div 
        className={`
          px-3 py-2 rounded-lg border transition-colors
          ${isAtOrderLimit 
            ? "bg-red-50 border-red-200 hover:bg-red-100" 
            : "bg-blue-50 border-blue-200 hover:bg-blue-100"
          }
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${isAtOrderLimit ? "text-red-600" : "text-blue-600"}`} />
            <span className={`text-xs font-medium ${isAtOrderLimit ? "text-red-700" : "text-blue-700"}`}>
              {getPlanDisplayName(plan)}
            </span>
          </div>
          <span className={`text-xs ${isAtOrderLimit ? "text-red-600" : "text-blue-600"}`}>
            {usage.orders.used}/{usage.orders.limit}
          </span>
        </div>
        <Progress 
          value={orderLimitPercentage} 
          className={`h-1.5 ${isAtOrderLimit ? "bg-red-200" : "bg-blue-200"}`}
        />
      </div>
    </Link>
  );
}
