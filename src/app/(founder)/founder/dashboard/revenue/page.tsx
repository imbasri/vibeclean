"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueData {
  total: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
  mrr: number;
  arr: number;
  breakdown: {
    period: string;
    subscription: number;
    addon: number;
    transactionFee: number;
  }[];
  topOrganizations: {
    id: string;
    name: string;
    revenue: number;
  }[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function FounderRevenuePage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [period, setPeriod] = useState<string>("month");
  const [isLoading, setIsLoading] = useState(true);

  const fetchRevenue = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/revenue?period=${period}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setRevenue(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const growth = revenue?.growth || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground">
            Laporan pendapatan VibeClean
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="year">Tahun Ini</SelectItem>
            <SelectItem value="all">Semua Waktu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(revenue?.total || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {growth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={growth >= 0 ? "text-green-500" : "text-red-500"}>
                    {growth >= 0 ? "+" : ""}{growth}%
                  </span>{" "}
                  dari periode sebelumnya
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Bulan Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(revenue?.thisMonth || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(revenue?.mrr || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(revenue?.arr || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Revenue</CardTitle>
            <CardDescription>Rincian pendapatan berdasarkan sumber</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">Subscription</p>
                    <p className="text-sm text-muted-foreground">Dari langganan paket</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(revenue?.breakdown?.[0]?.subscription || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">Add-ons</p>
                    <p className="text-sm text-muted-foreground">Dari fitur tambahan</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(revenue?.breakdown?.[0]?.addon || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">Transaction Fee</p>
                    <p className="text-sm text-muted-foreground">Dari biaya transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(revenue?.breakdown?.[0]?.transactionFee || 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Organizations</CardTitle>
            <CardDescription>Organisasi dengan pendapatan tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {revenue?.topOrganizations?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Belum ada data</p>
                ) : (
                  revenue?.topOrganizations?.map((org, index) => (
                    <div key={org.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <p className="font-medium">{org.name}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(org.revenue)}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
