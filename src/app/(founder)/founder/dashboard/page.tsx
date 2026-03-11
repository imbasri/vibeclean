"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
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
  };
  orders: {
    total: number;
    thisMonth: number;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  owner: {
    name: string | null;
    email: string | null;
  };
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-800",
  pro: "bg-blue-100 text-blue-800",
  enterprise: "bg-purple-100 text-purple-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  trial: "bg-yellow-100 text-yellow-800",
  expired: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export default function FounderDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Anda tidak memiliki akses");
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

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/organizations?limit=5&sortBy=createdAt&sortOrder=desc");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();
      setRecentOrgs(data.organizations || []);
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchOrganizations()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchStats, fetchOrganizations]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Error</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const revenueGrowth = stats?.revenue.growth || 0;
  const orgGrowth = stats?.organizations.growth || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Founder</h1>
          <p className="text-muted-foreground">
            Overview semua organisasi dan revenue VibeClean
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/founder/dashboard/organizations">
            <Button variant="outline">Lihat Semua Organisasi</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organisasi</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.organizations.total || 0)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={orgGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {orgGrowth >= 0 ? "+" : ""}{orgGrowth}%
              </span>{" "}
              dari bulan lalu
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.revenue.total || 0)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}%
              </span>{" "}
              dari bulan lalu
            </p>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.revenue.mrr || 0)}</div>
            <p className="text-xs text-muted-foreground">Per bulan ini</p>
          </CardContent>
        </Card>

        {/* Orders This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Bulan Ini</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.orders.thisMonth || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total: {formatNumber(stats?.orders.total || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution & Recent Orgs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Plan Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribusi Plan</CardTitle>
            <CardDescription>Jumlah organisasi berdasarkan plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-500" />
                  <span className="text-sm">Starter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.organizations.byPlan.starter || 0}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(((stats?.organizations.byPlan.starter || 0) / (stats?.organizations.total || 1)) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Pro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.organizations.byPlan.pro || 0}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(((stats?.organizations.byPlan.pro || 0) / (stats?.organizations.total || 1)) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Enterprise</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.organizations.byPlan.enterprise || 0}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(((stats?.organizations.byPlan.enterprise || 0) / (stats?.organizations.total || 1)) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Organizations */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Organisasi Terbaru</CardTitle>
            <CardDescription>Organisasi yang baru bergabung</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada organisasi</p>
              ) : (
                recentOrgs.map((org) => (
                  <div key={org.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.owner.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={PLAN_COLORS[org.plan] || "bg-gray-100"}>
                        {org.plan}
                      </Badge>
                      <Badge variant="outline" className={STATUS_COLORS[org.subscriptionStatus]}>
                        {org.subscriptionStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
