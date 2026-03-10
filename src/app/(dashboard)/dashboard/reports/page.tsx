"use client";

import { useState } from "react";
import { motion, type Variants, type Easing } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PermissionGuard } from "@/components/common/permission-guard";
import { formatCurrency } from "@/lib/utils";
import { useReports, type PeriodType } from "@/hooks/use-reports";

// Animation config
const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      ease: easeOut,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: easeOut }
  },
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodType>("week");
  
  // Fetch reports data from API
  const { data, isLoading, error, refetch } = useReports({ period });

  const handleExport = () => {
    gooeyToast.success("Export Dimulai", { description: "Laporan sedang diunduh..." });
    // TODO: Implement actual export functionality
  };

  // Calculate max for bar chart
  const maxRevenue = data?.revenue.daily.length 
    ? Math.max(...data.revenue.daily.map((d) => d.amount))
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-500">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Gagal Memuat Laporan</h3>
              <p className="text-gray-500 text-sm mt-1">{error}</p>
            </div>
            <Button onClick={() => refetch()} variant="outline">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Belum Ada Data</h3>
              <p className="text-gray-500 text-sm mt-1">
                Data laporan akan muncul setelah ada transaksi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { revenue, orders, services, customers, branches } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan & Analitik</h1>
          <p className="text-gray-500 mt-1">Pantau performa bisnis laundry Anda</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <PermissionGuard allowedRoles={["owner", "manager"]}>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pendapatan</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(revenue.total)}</p>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${revenue.isPositive ? "text-green-600" : "text-red-600"}`}>
                    {revenue.isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{revenue.change}%</span>
                    <span className="text-gray-400">vs periode lalu</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Order</p>
                  <p className="text-2xl font-bold mt-1">{orders.total}</p>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${orders.isPositive ? "text-green-600" : "text-red-600"}`}>
                    {orders.isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{orders.change}%</span>
                    <span className="text-gray-400">vs periode lalu</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pelanggan</p>
                  <p className="text-2xl font-bold mt-1">{customers.total}</p>
                  <div className="flex items-center gap-1 text-sm mt-1 text-green-600">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+{customers.new} baru</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rata-rata Order</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(orders.total > 0 ? revenue.total / orders.total : 0)}
                  </p>
                  <div className="flex items-center gap-1 text-sm mt-1 text-gray-400">
                    <span>per transaksi</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: easeOut }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    Pendapatan Harian
                  </CardTitle>
                  <CardDescription>Tren pendapatan 7 hari terakhir</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {revenue.daily.length > 0 ? (
                <div className="flex items-end justify-between gap-2 h-48">
                  {revenue.daily.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md cursor-pointer hover:from-blue-600 hover:to-blue-500 transition-colors relative group"
                        initial={{ height: 0 }}
                        animate={{ height: maxRevenue > 0 ? `${(item.amount / maxRevenue) * 100}%` : "4px" }}
                        transition={{ duration: 0.8, delay: 0.4 + index * 0.1, ease: easeOut }}
                        style={{ minHeight: item.amount > 0 ? "8px" : "4px" }}
                      >
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {formatCurrency(item.amount)}
                        </div>
                      </motion.div>
                      <span className="text-xs text-gray-500">{item.day}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  Belum ada data pendapatan
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: easeOut }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-gray-500" />
                    Status Order
                  </CardTitle>
                  <CardDescription>Distribusi status order saat ini</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                {/* Donut Chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {orders.byStatus.map((status, index) => {
                      const previousPercentages = orders.byStatus
                        .slice(0, index)
                        .reduce((sum, s) => sum + s.percentage, 0);
                      const circumference = 2 * Math.PI * 40;
                      const strokeDasharray = (status.percentage / 100) * circumference;
                      const strokeDashoffset = -(previousPercentages / 100) * circumference;
                      
                      return (
                        <motion.circle
                          key={status.status}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="12"
                          className={status.color.replace("bg-", "text-")}
                          initial={{ strokeDasharray: 0 }}
                          animate={{ strokeDasharray: `${strokeDasharray} ${circumference}` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: easeOut }}
                          style={{ strokeDashoffset }}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{orders.total}</p>
                      <p className="text-xs text-gray-500">Order</p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {orders.byStatus.map((status) => (
                    <div key={status.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span className="text-sm">{status.status}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {status.count} ({status.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Services & Customers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: easeOut }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                Layanan Terpopuler
              </CardTitle>
              <CardDescription>Berdasarkan jumlah order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.length > 0 ? (
                services.map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1, ease: easeOut }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{service.name}</span>
                      <span className="text-gray-500">{service.orders} order</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={service.percentage} className="flex-1 h-2" />
                      <span className="text-sm font-medium w-20 text-right">
                        {formatCurrency(service.revenue)}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Belum ada data layanan
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: easeOut }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Pelanggan Teratas
              </CardTitle>
              <CardDescription>Berdasarkan total belanja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customers.topCustomers.length > 0 ? (
                customers.topCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 + index * 0.1, ease: easeOut }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.orders} order</p>
                    </div>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(customer.spent)}
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Belum ada data pelanggan
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Branch Comparison - Owner only */}
      {branches.length > 0 && (
        <PermissionGuard allowedRoles={["owner"]}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: easeOut }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-500" />
                  Perbandingan Cabang
                </CardTitle>
                <CardDescription>Performa antar cabang periode ini</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {branches.map((branch, index) => (
                    <motion.div
                      key={branch.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 + index * 0.1, ease: easeOut }}
                      className="p-4 rounded-xl bg-gray-50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{branch.name}</h4>
                        <Badge variant="outline">{branch.percentage}%</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Pendapatan</span>
                          <span className="font-medium">{formatCurrency(branch.revenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Order</span>
                          <span className="font-medium">{branch.orders}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Rata-rata/Order</span>
                          <span className="font-medium">
                            {formatCurrency(branch.orders > 0 ? branch.revenue / branch.orders : 0)}
                          </span>
                        </div>
                      </div>
                      <Progress value={branch.percentage} className="h-2" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </PermissionGuard>
      )}
    </div>
  );
}
