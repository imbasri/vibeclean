"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  ArrowUpDown,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Withdrawal {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  amount: number;
  status: string;
  bankName: string;
  bankAccount: string;
  accountHolderName: string;
  createdAt: string;
  processedAt: string | null;
  notes: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
  processing: { color: "bg-blue-100 text-blue-800", icon: ArrowUpDown, label: "Processing" },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Completed" },
  rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Rejected" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FounderWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({ pending: { count: 0, total: 0 }, completed: { count: 0, total: 0 } });
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/founder/withdrawals?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setWithdrawals(data.withdrawals || []);
      setPagination(data.pagination || pagination);
      setStats(data.stats || { pending: { count: 0, total: 0 }, completed: { count: 0, total: 0 } });
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (withdrawal: Withdrawal) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/founder/withdrawals/${withdrawal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Failed to approve");
      
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    setIsRejecting(true);
    try {
      const response = await fetch(`/api/founder/withdrawals/${selectedWithdrawal?.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (!response.ok) throw new Error("Failed to reject");
      
      setSelectedWithdrawal(null);
      setRejectReason("");
      fetchWithdrawals();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-muted-foreground">Kelola pencairan saldo owner laundry</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pending.total)}</div>
            <p className="text-xs text-muted-foreground">{stats.pending.count} permintaan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.completed.total)}</div>
            <p className="text-xs text-muted-foreground">{stats.completed.count} transaksi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Total: {pagination.total} permintaan</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisasi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada permintaan withdrawal</p>
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => {
                  const statusConfig = STATUS_CONFIG[withdrawal.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{withdrawal.organizationName}</p>
                            <p className="text-xs text-muted-foreground">{withdrawal.accountHolderName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell>
                        <p className="text-sm">{withdrawal.bankName}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.bankAccount}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                      <TableCell>
                        {withdrawal.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedWithdrawal(withdrawal)}>
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Withdrawal</DialogTitle>
            <DialogDescription>
              Review permintaan pencairan dari {selectedWithdrawal?.organizationName}
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Jumlah</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedWithdrawal.amount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <p className="font-medium">{selectedWithdrawal.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Rekening</p>
                  <p className="font-medium">{selectedWithdrawal.bankAccount}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Alasan Penolakan</p>
                <Textarea placeholder="Masukkan alasan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} disabled={isRejecting} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWithdrawal(null)} disabled={isApproving || isRejecting}>Batal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectReason.trim()}>{isRejecting ? "Menolak..." : "Tolak"}</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedWithdrawal!)} disabled={isApproving}>{isApproving ? "Menyetuju..." : "Setuju"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
