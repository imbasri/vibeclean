"use client";

import React from "react";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard, RoleBadge } from "@/components/common/permission-guard";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="w-5 h-5 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {trend.value}%
              </span>
            )}
            {description && (
              <span className="text-xs text-gray-500">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// RECENT ORDERS TABLE
// ============================================

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: Date;
}

function RecentOrders({ orders, isLoading }: { orders: RecentOrder[]; isLoading: boolean }) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      washing: "bg-cyan-100 text-cyan-700",
      drying: "bg-indigo-100 text-indigo-700",
      ironing: "bg-purple-100 text-purple-700",
      ready: "bg-green-100 text-green-700",
      delivered: "bg-emerald-100 text-emerald-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Menunggu",
      processing: "Diproses",
      washing: "Dicuci",
      drying: "Dikeringkan",
      ironing: "Disetrika",
      ready: "Siap Ambil",
      delivered: "Diantar",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return labels[status] || status;
  };

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Pesanan Terbaru</CardTitle>
        <CardDescription>5 pesanan terakhir di cabang ini</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Belum ada pesanan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">No. Order</th>
                  <th className="pb-3 font-medium">Pelanggan</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="text-sm">
                    <td className="py-3 font-medium">{order.orderNumber}</td>
                    <td className="py-3">{order.customerName}</td>
                    <td className="py-3">{formatCurrency(order.total)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// QUICK ACTIONS
// ============================================

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aksi Cepat</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <a
          href="/dashboard/pos"
          className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors"
        >
          <ShoppingCart className="w-6 h-6 text-blue-600 mb-2" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Buat Order
          </span>
        </a>
        <a
          href="/dashboard/orders"
          className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 transition-colors"
        >
          <Clock className="w-6 h-6 text-green-600 mb-2" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Cek Pesanan
          </span>
        </a>
        <PermissionGuard roles={["owner", "manager"]} hideOnly>
          <a
            href="/dashboard/reports"
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Laporan
            </span>
          </a>
        </PermissionGuard>
        <PermissionGuard roles={["owner", "manager"]} hideOnly>
          <a
            href="/dashboard/staff"
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 transition-colors"
          >
            <Users className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Karyawan
            </span>
          </a>
        </PermissionGuard>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export default function DashboardPage() {
  const { user, activeBranch, activeRoles, isAuthenticated } = useAuth();
  
  // Fetch dashboard stats from API
  const { stats, trends, recentOrders, isLoading } = useDashboardStats({
    branchId: activeBranch?.id,
    period: "month",
  });

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Silakan Login</h1>
          <a
            href="/login"
            className="text-blue-600 hover:underline"
          >
            Klik di sini untuk login
          </a>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Selamat Datang, {user?.name?.split(" ")[0]}!
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-500">Peran aktif:</span>
          {activeRoles.map((role) => (
            <RoleBadge key={role} role={role} size="sm" />
          ))}
          {activeBranch && (
            <span className="text-gray-500">di {activeBranch.name}</span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <PermissionGuard roles={["owner", "manager"]}>
          <StatCard
            title="Total Pendapatan"
            value={isLoading ? "-" : formatCurrency(stats?.totalRevenue || 0)}
            icon={DollarSign}
            trend={trends?.revenue}
            description="vs bulan lalu"
          />
        </PermissionGuard>
        <StatCard
          title="Total Pesanan"
          value={isLoading ? "-" : (stats?.totalOrders || 0)}
          icon={ShoppingCart}
          trend={trends?.orders}
          description="vs bulan lalu"
        />
        <StatCard
          title="Pesanan Pending"
          value={isLoading ? "-" : (stats?.pendingOrders || 0)}
          icon={Clock}
          description="perlu diproses"
        />
        <StatCard
          title="Selesai"
          value={isLoading ? "-" : (stats?.completedOrders || 0)}
          icon={CheckCircle}
          trend={trends?.completed}
          description="vs bulan lalu"
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentOrders orders={recentOrders} isLoading={isLoading} />
        <QuickActions />
      </div>
    </DashboardLayout>
  );
}
