"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, type Variants, type Easing } from "framer-motion";
import { useReportsStore } from "@/stores";
import { useReports, type PeriodType } from "@/hooks/use-reports";
import {
  TrendingUp,
  TrendingDown,
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
  FileText,
  Printer,
  Building2,
  ArrowRightLeft,
  Settings,
  Save,
  Filter,
  Search,
} from "lucide-react";
import { gooeyToast } from "goey-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PermissionGuard } from "@/components/common/permission-guard";
import { formatCurrency } from "@/lib/utils";

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

type ReportPeriod = "today" | "week" | "month" | "quarter" | "year";

const handleExport = () => {
  gooeyToast("Mencoba mengekspor laporan...");
};

export default function ReportsPage() {
  // Zustand store
  const { period, setPeriod, activeTab, setActiveTab, taxSettings, setTaxSettings } = useReportsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error, refetch } = useReports({ period: period as PeriodType });

  const completedOrders = useMemo(() => {
    if (!data?.orders.byStatus) return 0;
    const completed = data.orders.byStatus.find(s => s.status === "completed");
    return completed?.count || 0;
  }, [data]);

  const summaryData = useMemo(() => ({
    totalRevenue: data?.revenue.total || 0,
    totalOrders: data?.orders.total || 0,
    avgOrderValue: data?.orders.total && data.revenue.total ? data.revenue.total / data.orders.total : 0,
    completedOrders: completedOrders,
    growth: data?.revenue.change || 0,
    ordersGrowth: data?.orders.change || 0,
  }), [data, completedOrders]);

  if (!mounted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PermissionGuard feature="reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Laporan & Analytics</h1>
            <p className="text-muted-foreground">Pantau performa bisnis laundry Anda</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hari Ini</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="quarter">Kuartal Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="ringkasan" className="gap-1">
              <BarChart3 className="w-4 h-4" />
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="transaksi" className="gap-1">
              <ShoppingBag className="w-4 h-4" />
              Transaksi
            </TabsTrigger>
            <TabsTrigger value="pajak" className="gap-1">
              <FileText className="w-4 h-4" />
              Pajak
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Ringkasan */}
          <TabsContent value="ringkasan" className="space-y-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : (
              <motion.div 
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        {summaryData.growth >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" /> : <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />}
                        <span className={summaryData.growth >= 0 ? "text-green-500" : "text-red-500"}>{Math.abs(summaryData.growth)}%</span>
                        <span className="ml-1">dari periode sebelumnya</span>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Order</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summaryData.totalOrders}</div>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        {summaryData.ordersGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" /> : <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />}
                        <span className={summaryData.ordersGrowth >= 0 ? "text-green-500" : "text-red-500"}>{Math.abs(summaryData.ordersGrowth)}%</span>
                        <span className="ml-1">dari periode sebelumnya</span>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rata-rata Order</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summaryData.avgOrderValue)}</div>
                      <p className="text-xs text-muted-foreground mt-1">per transaksi</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Order Selesai</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summaryData.completedOrders}</div>
                      <Progress value={(summaryData.completedOrders / summaryData.totalOrders) * 100 || 0} className="mt-2" />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* Quick Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tren Pendapatan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.revenue.daily || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                        <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Layanan Terpopuler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(data?.services || []).slice(0, 5).map((service, index) => (
                      <div key={service.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.orders} order</p>
                          </div>
                        </div>
                        <p className="font-semibold">{formatCurrency(service.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Transaksi */}
          <TabsContent value="transaksi" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daftar Transaksi</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Cari order..." className="pl-8 w-[200px]" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.orders.byStatus && data.orders.byStatus.length > 0 ? (
                    data.orders.byStatus.slice(0, 10).map((statusItem) => (
                      <div key={statusItem.status} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium capitalize">{statusItem.status}</p>
                          <p className="text-sm text-muted-foreground">{statusItem.percentage}% dari total</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{statusItem.count} order</p>
                          <div className="w-20 h-2 bg-muted rounded-full mt-1">
                            <div 
                              className="h-full rounded-full" 
                              style={{ width: `${statusItem.percentage}%`, backgroundColor: statusItem.color }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Tidak ada transaksi</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Pajak */}
          <TabsContent value="pajak" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Laporan Pajak
                </CardTitle>
                <CardDescription>Kelola pengaturan dan laporan pajak bisnis Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tax Settings */}
                <div className="space-y-4">
                  {/* PPN Setting */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Pajak Pertambahan Nilai (PPN)</p>
                        <p className="text-sm text-muted-foreground">Default: 11%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        className="w-20 text-right"
                        value={taxSettings.ppn.rate}
                        onChange={(e) => setTaxSettings({ ...taxSettings, ppn: { ...taxSettings.ppn, rate: Number(e.target.value) } })}
                        disabled={!taxSettings.ppn.enabled}
                      />
                      <span className="text-lg font-bold">%</span>
                      <Switch checked={taxSettings.ppn.enabled} onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, ppn: { ...taxSettings.ppn, enabled: checked } })} />
                    </div>
                  </div>

                  {/* PPH Setting */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Pajak Penghasilan (PPH)</p>
                        <p className="text-sm text-muted-foreground">Default: 2%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        className="w-20 text-right"
                        value={taxSettings.pph.rate}
                        onChange={(e) => setTaxSettings({ ...taxSettings, pph: { ...taxSettings.pph, rate: Number(e.target.value) } })}
                        disabled={!taxSettings.pph.enabled}
                      />
                      <span className="text-lg font-bold">%</span>
                      <Switch checked={taxSettings.pph.enabled} onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, pph: { ...taxSettings.pph, enabled: checked } })} />
                    </div>
                  </div>
                </div>

                {/* Tax Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Pendapatan Kotor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">PPN ({taxSettings.ppn.rate}%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatCurrency(taxSettings.ppn.enabled ? summaryData.totalRevenue * (taxSettings.ppn.rate / 100) : 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">PPH ({taxSettings.pph.rate}%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatCurrency(taxSettings.pph.enabled ? summaryData.totalRevenue * (taxSettings.pph.rate / 100) : 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Pendapatan Bersih</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          summaryData.totalRevenue - 
                          (taxSettings.ppn.enabled ? summaryData.totalRevenue * (taxSettings.ppn.rate / 100) : 0) -
                          (taxSettings.pph.enabled ? summaryData.totalRevenue * (taxSettings.pph.rate / 100) : 0)
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tax Report Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rincian per Bulan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium">Bulan</th>
                            <th className="text-right p-3 text-sm font-medium">Pendapatan</th>
                            <th className="text-right p-3 text-sm font-medium">PPN</th>
                            <th className="text-right p-3 text-sm font-medium">PPH</th>
                            <th className="text-right p-3 text-sm font-medium">Bersih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, i) => {
                            const revenue = summaryData.totalRevenue / 6;
                            const ppn = taxSettings.ppn.enabled ? revenue * (taxSettings.ppn.rate / 100) : 0;
                            const pph = taxSettings.pph.enabled ? revenue * (taxSettings.pph.rate / 100) : 0;
                            return (
                              <tr key={month} className="border-t">
                                <td className="p-3">{month} 2026</td>
                                <td className="p-3 text-right">{formatCurrency(revenue)}</td>
                                <td className="p-3 text-right">{formatCurrency(ppn)}</td>
                                <td className="p-3 text-right">{formatCurrency(pph)}</td>
                                <td className="p-3 text-right font-medium">{formatCurrency(revenue - ppn - pph)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <Printer className="w-4 h-4 mr-2" />
                    Cetak Laporan
                  </Button>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Tren Pendapatan</CardTitle>
                  <CardDescription>Perkembangan pendapatan per periode</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.revenue.daily || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                        <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Orders Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Order</CardTitle>
                  <CardDescription>Jumlah order berdasarkan status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.orders.byStatus || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Layanan Teratas</CardTitle>
                  <CardDescription>Layanan dengan pendapatan tertinggi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(data?.services || []).slice(0, 5)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={12} />
                        <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Pelanggan Teratas</CardTitle>
                  <CardDescription>Pelanggan dengan transaksi tertinggi</CardDescription>
                </CardHeader>
                  <CardContent>
                  <div className="space-y-4">
                    {(data?.customers.topCustomers || []).slice(0, 5).map((customer, index) => (
                      <div key={`${customer.name}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.orders} order</p>
                          </div>
                        </div>
                        <p className="font-semibold text-green-600">{formatCurrency(customer.spent)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
