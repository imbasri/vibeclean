"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Crown,
  Zap,
  Building,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  Calendar,
  DollarSign,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggleSimple } from "@/components/common/theme-toggle";
import { formatCurrency } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface AdminStats {
  organizations: {
    total: number;
    byPlan: { starter: number; pro: number; enterprise: number };
    byStatus: { active: number; trial: number; expired: number };
    newThisMonth: number;
    growth: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    mrr: number;
    arr: number;
  };
  orders: {
    total: number;
    thisMonth: number;
    gmv: number;
    gmvThisMonth: number;
  };
  branches: { total: number };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: "starter" | "pro" | "enterprise";
  subscriptionStatus: "active" | "trial" | "expired" | "cancelled";
  trialEndsAt: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
  subscription: {
    id: string;
    billingCycle: string;
    price: number;
    monthlyOrderCount: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    mayarCustomerId: string | null;
  } | null;
  stats: {
    branchCount: number;
    totalOrders: number;
    totalRevenue: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
}

function StatCard({ title, value, description, icon: Icon, trend, trendLabel }: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <span
              className={`flex items-center text-xs font-medium ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
          {(description || trendLabel) && (
            <span className="text-xs text-muted-foreground">
              {trendLabel || description}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// ORGANIZATION ROW COMPONENT
// ============================================

function OrganizationRow({ org }: { org: Organization }) {
  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "pro":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100"><Crown className="h-3 w-3 mr-1" />Pro</Badge>;
      case "enterprise":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Building className="h-3 w-3 mr-1" />Enterprise</Badge>;
      default:
        return <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Starter</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Trial</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {org.logo ? (
              <img src={org.logo} alt={org.name} className="h-8 w-8 rounded" />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium">{org.name}</p>
            <p className="text-xs text-muted-foreground">{org.slug}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{org.owner.email || "-"}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{org.owner.name}</p>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          {getPlanBadge(org.plan)}
          {getStatusBadge(org.subscriptionStatus)}
        </div>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="font-medium">{org.stats.branchCount}</span>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="font-medium">{org.stats.totalOrders}</span>
        {org.subscription && (
          <p className="text-xs text-muted-foreground">
            {org.subscription.monthlyOrderCount} bulan ini
          </p>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <span className="font-medium">{formatCurrency(org.stats.totalRevenue)}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(org.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </td>
      <td className="py-4 px-4">
        <Link 
          href={`/admin/organizations/${org.id}`}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

// ============================================
// MAIN ADMIN PAGE
// ============================================

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Anda tidak memiliki akses admin");
          return;
        }
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Gagal memuat statistik");
    }
  }, []);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    setIsLoadingOrgs(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);
      if (planFilter && planFilter !== "all") params.set("plan", planFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/organizations?${params}`);
      if (!response.ok) {
        if (response.status === 403) {
          setError("Anda tidak memiliki akses admin");
          return;
        }
        throw new Error("Failed to fetch organizations");
      }
      const data = await response.json();
      setOrganizations(data.organizations);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error("Error fetching organizations:", err);
    } finally {
      setIsLoadingOrgs(false);
    }
  }, [pagination.page, pagination.limit, search, planFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchOrganizations()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Refetch orgs when filters change
  useEffect(() => {
    fetchOrganizations();
  }, [pagination.page, planFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoading) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchOrganizations();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Akses Ditolak</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard"
              className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">Admin Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchOrganizations(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <ThemeToggleSimple />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : stats && (
            <>
              <StatCard
                title="Total Organizations"
                value={stats.organizations.total}
                icon={Building2}
                trend={stats.organizations.growth}
                trendLabel="vs bulan lalu"
              />
              <StatCard
                title="Monthly Recurring Revenue"
                value={formatCurrency(stats.revenue.mrr)}
                icon={DollarSign}
                trend={stats.revenue.growth}
                trendLabel="vs bulan lalu"
              />
              <StatCard
                title="Total Orders (GMV)"
                value={formatCurrency(stats.orders.gmv)}
                icon={ShoppingCart}
                description={`${stats.orders.total.toLocaleString()} orders`}
              />
              <StatCard
                title="Active Subscribers"
                value={stats.organizations.byPlan.pro + stats.organizations.byPlan.enterprise}
                icon={CreditCard}
                description={`Pro: ${stats.organizations.byPlan.pro}, Enterprise: ${stats.organizations.byPlan.enterprise}`}
              />
            </>
          )}
        </div>

        {/* Plan Distribution */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Starter (Free)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.organizations.byPlan.starter}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((stats.organizations.byPlan.starter / stats.organizations.total) * 100)}% dari total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-500" />
                  Pro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.organizations.byPlan.pro}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.organizations.byPlan.pro * 149000)}/bulan
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-500" />
                  Enterprise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.organizations.byPlan.enterprise}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.organizations.byPlan.enterprise * 499000)}/bulan
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>
                  {pagination.total} organization terdaftar
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={planFilter} onValueChange={(value) => setPlanFilter(value ?? "all")}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Plan</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 px-4 font-medium">Organization</th>
                    <th className="pb-3 px-4 font-medium">Owner</th>
                    <th className="pb-3 px-4 font-medium">Plan & Status</th>
                    <th className="pb-3 px-4 font-medium text-center">Branches</th>
                    <th className="pb-3 px-4 font-medium text-center">Orders</th>
                    <th className="pb-3 px-4 font-medium text-right">Revenue</th>
                    <th className="pb-3 px-4 font-medium">Created</th>
                    <th className="pb-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingOrgs ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={8} className="py-4 px-4">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : organizations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Tidak ada organization ditemukan
                      </td>
                    </tr>
                  ) : (
                    organizations.map((org) => (
                      <OrganizationRow key={org.id} org={org} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
