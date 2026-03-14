"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Package,
  User,
  Phone,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useMemberSubscriptions, useMemberPackages, type MemberSubscription } from "@/hooks/use-member-packages";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SubscribeCustomerDialog } from "@/components/pos/subscribe-customer-dialog";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Aktif", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  cancelled: { label: "Dibatalkan", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: Clock },
};

export default function MemberSubscriptionsPage() {
  const router = useRouter();
  const { subscriptions, isLoading, error, refetch, cancelSubscription, renewSubscription, createSubscription } = useMemberSubscriptions();
  const { packages } = useMemberPackages();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string | null>("all");
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);

  const handleSubscribe = async (data: {
    customerId: string;
    packageId: string;
    startDate: string;
    endDate: string;
    autoRenew: boolean;
  }) => {
    await createSubscription({
      customerId: data.customerId,
      packageId: data.packageId,
      startDate: data.startDate,
      endDate: data.endDate,
      autoRenew: data.autoRenew,
    });
    refetch();
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.customerPhone?.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesPackage = packageFilter === "all" || sub.packageName === packageFilter;
    return matchesSearch && matchesStatus && matchesPackage;
  });

  const uniquePackages = Array.from(new Set(subscriptions.map(s => s.packageName))).filter(Boolean);

  const handleCancel = async (id: string) => {
    try {
      await cancelSubscription(id);
      gooeyToast.success("Subscription dibatalkan");
      refetch();
    } catch (error) {
      gooeyToast.error("Gagal membatalkan subscription");
    }
  };

  const handleRenew = async (id: string) => {
    try {
      await renewSubscription(id);
      gooeyToast.success("Subscription diperpanjang");
      refetch();
    } catch (error) {
      gooeyToast.error("Gagal memperpanjang subscription");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Users className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/members")}
            className="shrink-0"
          >
            ← Kembali ke Paket
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription Member</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola pelanggan yang berlangganan paket member
            </p>
          </div>
        </div>
        <Button onClick={() => setShowSubscribeDialog(true)}>
          <Users className="w-4 h-4 mr-2" />
          Subscribe Customer
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {subscriptions.filter(s => s.status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {subscriptions.filter(s => s.status === "expired").length}
                </p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {subscriptions.filter(s => s.status === "cancelled").length}
                </p>
                <p className="text-sm text-muted-foreground">Dibatalkan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {subscriptions.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari customer (nama/no HP)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={packageFilter} onValueChange={(v) => setPackageFilter(v || "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Package className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter Paket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Paket</SelectItem>
                {uniquePackages.map(pkg => (
                  <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Tidak ada subscription</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Coba ubah filter pencarian"
                  : "Belum ada customer yang subscribe paket member"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => {
                    const StatusIcon = statusConfig[sub.status]?.icon || Clock;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.customerName}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{sub.customerPhone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{sub.packageName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[sub.status]?.color} border gap-1 font-medium`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[sub.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-foreground">{formatDate(sub.startDate)}</p>
                              <p className="text-muted-foreground text-xs">
                                s/d {formatDate(sub.endDate)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {sub.transactionsThisMonth || 0}x / bulan
                          </p>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={(props) => (
                              <Button {...props} variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            )}>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {sub.status === "active" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleRenew(sub.id)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Perpanjang
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCancel(sub.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Batalkan
                                  </DropdownMenuItem>
                                </>
                              )}
                              {sub.status === "expired" && (
                                <DropdownMenuItem onClick={() => handleRenew(sub.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Perpanjang
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribe Customer Dialog */}
      <SubscribeCustomerDialog
        open={showSubscribeDialog}
        onOpenChange={setShowSubscribeDialog}
        onSubscribe={handleSubscribe}
      />
    </div>
  );
}
