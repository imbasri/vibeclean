"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Percent,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
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

interface TransactionFeeStats {
  total: number;
  totalTransactions: number;
  thisMonth: {
    fee: number;
    transactions: number;
  };
  lastMonth: {
    fee: number;
    transactions: number;
  };
  growth: number;
  averageFee: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export default function FounderTransactionFeePage() {
  const [stats, setStats] = useState<TransactionFeeStats | null>(null);
  const [period, setPeriod] = useState("month");
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/founder/transaction-fee?period=${period}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handlePeriodChange = (value: string | null) => {
    setPeriod(value || "month");
  };

  const growth = stats?.growth || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Fee</h1>
          <p className="text-muted-foreground">
            Kelola biaya transaksi dari semua organisasi
          </p>
        </div>
        <Select value={period} onValueChange={handlePeriodChange}>
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
            <CardTitle className="text-sm font-medium">Total Fee</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats?.totalTransactions || 0)} transaksi
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Bulan Ini</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.thisMonth.fee || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats?.thisMonth.transactions || 0)} transaksi
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Fee</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.averageFee || 0)}</div>
                <p className="text-xs text-muted-foreground">Per transaksi</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            {growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {growth >= 0 ? "+" : ""}{growth}%
                </div>
                <p className="text-xs text-muted-foreground">vs bulan lalu</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tentang Transaction Fee</CardTitle>
          <CardDescription>
            Biaya transaksi adalah pendapatan dari setiap transaksi yang menggunakan pembayaran digital Mayar.
            Fee akan automatically dipotong dari setiap pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Periode Saat Ini</p>
              <p className="text-lg font-medium">{period === "month" ? "Bulan Ini" : period === "year" ? "Tahun Ini" : "Semua Waktu"}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Pendapatan Fee</p>
              <p className="text-lg font-medium">{formatCurrency(stats?.thisMonth.fee || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
