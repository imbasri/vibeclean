"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Printer,
  MoreHorizontal,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { gooeyToast } from "goey-toast";

import { useAuth } from "@/contexts/auth-context";
import { useOrders } from "@/hooks/use-orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelOrderDialog } from "@/components/common";
import { OrderDetailDialog } from "@/components/orders";
import { PaymentQRISDialog } from "@/components/pos/payment-qris-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

// Status config for consistent styling
const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700", icon: Clock },
  processing: { label: "Diproses", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700", icon: Package },
  washing: { label: "Dicuci", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700", icon: Package },
  drying: { label: "Dikeringkan", color: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700", icon: Package },
  ironing: { label: "Disetrika", color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700", icon: Package },
  ready: { label: "Siap Ambil", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700", icon: CheckCircle2 },
  delivered: { label: "Diantar", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700", icon: Truck },
  completed: { label: "Selesai", color: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700", icon: XCircle },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: "Belum Bayar", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  partial: { label: "Sebagian", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid: { label: "Lunas", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  refunded: { label: "Refund", color: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.color} border gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status];
  return (
    <Badge className={`${config.color} font-medium`}>
      {config.label}
    </Badge>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { activeBranch } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "total_high" | "total_low">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Use the orders hook with filters
  const {
    orders,
    isLoading,
    error,
    refetch,
    cancelOrder,
  } = useOrders({
    branchId: activeBranch?.id,
    status: statusFilter as OrderStatus | "all",
    paymentStatus: paymentFilter as PaymentStatus | "all",
    search: searchQuery || undefined,
  });

  // Cancel order dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Order detail dialog state
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // QRIS Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);

  // Handler for opening detail dialog
  const openDetailDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  // Handler for printing receipt
  const handlePrintReceipt = (order: Order) => {
    // Open print dialog or navigate to print page
    window.open(`/dashboard/orders/print/${order.id}`, '_blank');
  };

  // Handler for opening cancel dialog
  const openCancelDialog = (order: Order) => {
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  };

  // Handler for canceling order
  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    
    try {
      setIsCancelling(true);
      await cancelOrder(orderToCancel.id);
      
      gooeyToast.success("Order Dibatalkan", {
        description: `Order ${orderToCancel.orderNumber} berhasil dibatalkan`,
      });
      
      setOrderToCancel(null);
      setIsCancelDialogOpen(false);
    } catch (err) {
      gooeyToast.error("Gagal Membatalkan", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setIsCancelling(false);
    }
  };
  
  // Handler for opening payment dialog from detail view
  const handleOpenPayment = () => {
    if (selectedOrder) {
      setOrderForPayment(selectedOrder);
      setIsDetailDialogOpen(false);
      setShowPaymentDialog(true);
    }
  };
  
  // Handler for payment success
  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setOrderForPayment(null);
    refetch();
    gooeyToast.success("Pembayaran berhasil diterima!");
  };
  
  // Handler for payment expired
  const handlePaymentExpired = () => {
    gooeyToast.warning("Waktu pembayaran habis");
  };

  // Filter and sort orders locally (API already filters by branch, status, payment)
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Sort locally
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "total_high":
          return b.total - a.total;
        case "total_low":
          return a.total - b.total;
        default:
          return 0;
      }
    });

    return result;
  }, [orders, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats summary
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing" || o.status === "washing" || o.status === "drying" || o.status === "ironing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      todayCount: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? o.total : 0), 0),
    };
  }, [orders]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Gagal memuat pesanan</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" onClick={refetch}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Pesanan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola semua pesanan di {activeBranch?.name || "cabang"}
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/pos")} className="gap-2">
          <Plus className="w-4 h-4" />
          Pesanan Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Menunggu</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Diproses</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.processing}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Siap Ambil</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ready}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Hari Ini</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.todayCount}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">Revenue</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.todayRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor order, nama, atau telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="processing">Diproses</SelectItem>
                <SelectItem value="washing">Dicuci</SelectItem>
                <SelectItem value="drying">Dikeringkan</SelectItem>
                <SelectItem value="ironing">Disetrika</SelectItem>
                <SelectItem value="ready">Siap Ambil</SelectItem>
                <SelectItem value="delivered">Diantar</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={(v) => v && setPaymentFilter(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pembayaran</SelectItem>
                <SelectItem value="unpaid">Belum Bayar</SelectItem>
                <SelectItem value="partial">Sebagian</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="total_high">Total Tertinggi</SelectItem>
                <SelectItem value="total_low">Total Terendah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block md:hidden">
            {paginatedOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                <Package className="w-10 h-10 text-muted-foreground/50" />
                <p>Tidak ada pesanan ditemukan</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paginatedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono font-medium text-blue-600 dark:text-blue-400">{order.orderNumber}</p>
                        <p className="font-medium text-foreground">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={(props) => (
                            <Button {...props} variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          )}
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailDialog(order)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Printer className="w-4 h-4 mr-2" />
                            Cetak Struk
                          </DropdownMenuItem>
                          {order.status === "ready" && (
                            <DropdownMenuItem>
                              <Truck className="w-4 h-4 mr-2" />
                              Tandai Dikirim
                            </DropdownMenuItem>
                          )}
                          {order.status !== "completed" && order.status !== "cancelled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 dark:text-red-400"
                                onClick={() => openCancelDialog(order)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Batalkan
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.items?.map((i) => i.serviceName).join(", ") || "No items"}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <PaymentBadge status={order.paymentStatus} />
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(order.createdAt)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Order</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="w-10 h-10 text-muted-foreground/50" />
                        <p>Tidak ada pesanan ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() => openDetailDialog(order)}
                    >
                      <TableCell className="font-mono font-medium text-blue-600 dark:text-blue-400">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">
                            {order.items?.map((i) => i.serviceName).join(", ") || "No items"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} item
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentBadge status={order.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={(props) => (
                              <Button {...props} variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            )}
                          />
                          <DropdownMenuContent align="end">
                            <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                              Aksi
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDetailDialog(order)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="w-4 h-4 mr-2" />
                              Cetak Struk
                            </DropdownMenuItem>
                            {order.status === "ready" && (
                              <DropdownMenuItem>
                                <Truck className="w-4 h-4 mr-2" />
                                Tandai Dikirim
                              </DropdownMenuItem>
                            )}
                            {order.status !== "completed" && order.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => openCancelDialog(order)}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Batalkan
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} dari {filteredOrders.length} pesanan
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        orderNumber={orderToCancel?.orderNumber || ""}
        onConfirm={handleCancelOrder}
      />
      
      {/* Order Detail Dialog */}
      <OrderDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        order={selectedOrder}
        onOpenPayment={handleOpenPayment}
        onUpdate={refetch}
      />
      
      {/* QRIS Payment Dialog */}
      {orderForPayment && (
        <PaymentQRISDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          orderId={orderForPayment.id}
          orderNumber={orderForPayment.orderNumber}
          amount={orderForPayment.total}
          customerName={orderForPayment.customerName}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentExpired={handlePaymentExpired}
        />
      )}
    </div>
  );
}
