"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Package,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  Store,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggleSimple } from "@/components/common/theme-toggle";
import { formatCurrency } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/admin";

// ============================================
// TYPES
// ============================================

interface OrganizationDetail {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    plan: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
    owner: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      image: string | null;
    };
  };
  subscription: {
    id: string;
    billingCycle: string;
    price: number;
    monthlyOrderCount: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    mayarCustomerId: string | null;
    createdAt: string;
  } | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    amount: number;
    status: string;
    paidAt: string | null;
    billingCycle: string;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
  }>;
  branches: Array<{
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  stats: {
    branchCount: number;
    staffCount: number;
    allTime: {
      totalOrders: number;
      totalRevenue: number;
      paidOrders: number;
      pendingOrders: number;
    };
    thisMonth: {
      totalOrders: number;
      totalRevenue: number;
    };
    monthlyTrend: Array<{
      month: string;
      orderCount: number;
      revenue: number;
    }>;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
    branchName: string;
  }>;
}

// ============================================
// HELPER COMPONENTS
// ============================================

function PlanBadge({ plan }: { plan: string }) {
  const colors = {
    starter: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    pro: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };
  return (
    <Badge className={colors[plan as keyof typeof colors] || colors.starter}>
      {plan.toUpperCase()}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle },
    trial: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: Clock },
    expired: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
    cancelled: { color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: AlertCircle },
  };
  const cfg = config[status as keyof typeof config] || config.trial;
  const Icon = cfg.icon;
  return (
    <Badge className={cfg.color}>
      <Icon className="h-3 w-3 mr-1" />
      {status.toUpperCase()}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors = {
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <Badge className={colors[status as keyof typeof colors] || colors.pending}>
      {status.toUpperCase()}
    </Badge>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    washing: "bg-cyan-100 text-cyan-800",
    drying: "bg-orange-100 text-orange-800",
    ironing: "bg-purple-100 text-purple-800",
    ready: "bg-green-100 text-green-800",
    delivered: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={colors[status] || colors.pending}>
      {status.toUpperCase()}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [data, setData] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const res = await fetch(`/api/admin/organizations/${id}`);
        if (!res.ok) {
          if (res.status === 403) {
            setError("Akses ditolak. Anda bukan admin.");
            return;
          }
          if (res.status === 404) {
            setError("Organization tidak ditemukan.");
            return;
          }
          throw new Error("Failed to fetch organization");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError("Terjadi kesalahan saat memuat data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      fetchOrganization();
    }
  }, [id, session]);

  if (sessionLoading || loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Admin
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { organization, subscription, invoices, branches, stats, recentOrders } = data;
  const limits = PLAN_LIMITS[organization.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Admin Dashboard
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-lg font-semibold">{organization.name}</h1>
            </div>
            <ThemeToggleSimple />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Organization Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {organization.logo ? (
                  <img
                    src={organization.logo}
                    alt={organization.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold">{organization.name}</h2>
                    <PlanBadge plan={organization.plan} />
                    <StatusBadge status={organization.subscriptionStatus} />
                  </div>
                  <p className="text-muted-foreground">@{organization.slug}</p>
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.owner.email || "-"}</span>
                  </div>
                  {organization.owner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{organization.owner.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Bergabung {new Date(organization.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Limits */}
              <div className="flex-shrink-0">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Plan Limits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Branches:</span>
                      <span className="font-medium">
                        {limits.branches === Infinity ? "Unlimited" : limits.branches}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Staff/Branch:</span>
                      <span className="font-medium">
                        {limits.staffPerBranch === Infinity ? "Unlimited" : limits.staffPerBranch}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Orders/Month:</span>
                      <span className="font-medium">
                        {limits.ordersPerMonth === Infinity ? "Unlimited" : limits.ordersPerMonth}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue (All Time)"
            value={formatCurrency(stats.allTime.totalRevenue)}
            icon={TrendingUp}
            description={`${stats.allTime.paidOrders} orders terbayar`}
          />
          <StatCard
            title="Revenue Bulan Ini"
            value={formatCurrency(stats.thisMonth.totalRevenue)}
            icon={CreditCard}
            description={`${stats.thisMonth.totalOrders} orders`}
          />
          <StatCard
            title="Total Cabang"
            value={stats.branchCount}
            icon={Store}
            description={`Limit: ${limits.branches === Infinity ? "Unlimited" : limits.branches}`}
          />
          <StatCard
            title="Total Staff"
            value={stats.staffCount}
            icon={Users}
          />
        </div>

        {/* Usage This Month */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Usage Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Orders</span>
                    <span>
                      {subscription.monthlyOrderCount} / {limits.ordersPerMonth === Infinity ? "Unlimited" : limits.ordersPerMonth}
                    </span>
                  </div>
                  {limits.ordersPerMonth !== Infinity && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((subscription.monthlyOrderCount / limits.ordersPerMonth) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Periode berakhir: {new Date(subscription.currentPeriodEnd).toLocaleDateString("id-ID")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Subscription Invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Subscription Invoices
              </CardTitle>
              <CardDescription>
                Riwayat pembayaran langganan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada invoice
                </p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <PaymentStatusBadge status={invoice.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Cabang ({branches.length})
              </CardTitle>
              <CardDescription>
                Daftar cabang laundry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada cabang
                </p>
              ) : (
                <div className="space-y-3">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{branch.name}</p>
                          {branch.isActive ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {branch.address || "Alamat belum diisi"}
                        </p>
                      </div>
                      {branch.phone && (
                        <p className="text-sm text-muted-foreground">{branch.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders Terbaru
            </CardTitle>
            <CardDescription>
              10 order terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada order
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Order #</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Branch</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Payment</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-3 font-mono text-sm">{order.orderNumber}</td>
                        <td className="py-3">{order.customerName}</td>
                        <td className="py-3 text-sm text-muted-foreground">{order.branchName}</td>
                        <td className="py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-3">
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        {stats.monthlyTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trend 6 Bulan Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                {stats.monthlyTrend.map((month) => (
                  <div key={month.month} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(month.month + "-01").toLocaleDateString("id-ID", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                    <p className="text-lg font-bold">{month.orderCount}</p>
                    <p className="text-xs text-muted-foreground">orders</p>
                    <p className="text-sm font-medium text-green-600 mt-1">
                      {formatCurrency(month.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
