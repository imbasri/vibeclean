"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AddonPurchase {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  productId: string;
  productName: string;
  productType: string;
  price: number;
  quota: number;
  usedQuota: number;
  status: string;
  startedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Stats {
  customDomain: {
    active: number;
    total: number;
  };
  whatsapp: {
    active: number;
    total: number;
  };
  totalRevenue: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  active: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Aktif" },
  expired: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Expired" },
  cancelled: { color: "bg-gray-100 text-gray-800", icon: XCircle, label: "Dibatalkan" },
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  custom_domain: { icon: Globe, label: "Custom Domain", color: "bg-blue-100 text-blue-800" },
  whatsapp_quota: { icon: MessageCircle, label: "WhatsApp", color: "bg-green-100 text-green-800" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FounderAddonsPage() {
  const [addons, setAddons] = useState<AddonPurchase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const fetchAddons = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      params.set("limit", "50");

      const response = await fetch(`/api/founder/addons?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      setAddons(data.addons || []);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add-ons</h1>
        <p className="text-muted-foreground">
          Kelola pembelian add-on semua organisasi
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom Domain</CardTitle>
              <Globe className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customDomain.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.customDomain.total} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp Quota</CardTitle>
              <MessageCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whatsapp.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.whatsapp.total} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination?.total || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Badge
          variant={filterType === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilterType("all")}
        >
          Semua
        </Badge>
        <Badge
          variant={filterType === "custom_domain" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilterType("custom_domain")}
        >
          <Globe className="h-3 w-3 mr-1" />
          Custom Domain
        </Badge>
        <Badge
          variant={filterType === "whatsapp_quota" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilterType("whatsapp_quota")}
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          WhatsApp
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisasi</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Berakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : addons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada purchases</p>
                  </TableCell>
                </TableRow>
              ) : (
                addons.map((addon) => {
                  const statusConfig = STATUS_CONFIG[addon.status] || STATUS_CONFIG.expired;
                  const StatusIcon = statusConfig.icon;
                  const typeConfig = TYPE_CONFIG[addon.productType] || TYPE_CONFIG.custom_domain;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <TableRow key={addon.id}>
                      <TableCell>
                        <p className="font-medium">{addon.organizationName}</p>
                        <p className="text-xs text-muted-foreground">/{addon.organizationSlug}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <span>{addon.productName}</span>
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {addon.quota > 0 ? (
                          <div>
                            <p>{addon.usedQuota} / {addon.quota}</p>
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                              <div
                                className="h-1.5 bg-primary rounded-full"
                                style={{ width: `${(addon.usedQuota / addon.quota) * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(addon.price)}</TableCell>
                      <TableCell>{formatDate(addon.startedAt)}</TableCell>
                      <TableCell>{formatDate(addon.expiresAt)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
