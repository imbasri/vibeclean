"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Wallet,
  Sparkles,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Subscription {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  plan: string;
  status: string;
  billingCycle: string;
  price: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  organizationName: string;
  plan: string;
  amount: number;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  active: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Aktif" },
  trial: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Trial" },
  expired: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Expired" },
  cancelled: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, label: "Dibatalkan" },
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
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

export default function FounderSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/organizations?limit=100&status=all");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      
      // Transform organizations to subscriptions
      const subs: Subscription[] = data.organizations?.map((org: any) => ({
        id: org.subscription?.id || org.id,
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
        plan: org.plan,
        status: org.subscriptionStatus,
        billingCycle: org.subscription?.billingCycle || "monthly",
        price: org.subscription?.price || 0,
        currentPeriodStart: org.subscription?.currentPeriodStart,
        currentPeriodEnd: org.subscription?.currentPeriodEnd,
        createdAt: org.createdAt,
      })) || [];
      
      setSubscriptions(subs);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPendingInvoices = useCallback(async () => {
    try {
      const response = await fetch("/api/founder/pending-invoices");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPendingInvoices(data.invoices || []);
    } catch (err) {
      console.error("Error fetching pending invoices:", err);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchPendingInvoices();
  }, [fetchSubscriptions, fetchPendingInvoices]);

  const handleActivate = async (orgId: string, plan: string) => {
    setIsActivating(true);
    try {
      const response = await fetch("/api/admin/activate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, plan }),
      });
      
      if (!response.ok) throw new Error("Failed to activate");
      
      setSelectedSub(null);
      fetchSubscriptions();
      fetchPendingInvoices();
      gooeyToast.success("Berhasil!", { description: "Subscription diaktifkan" });
    } catch (err) {
      console.error("Error activating:", err);
      gooeyToast.error("Gagal", { description: "Tidak dapat mengaktifkan subscription" });
    } finally {
      setIsActivating(false);
    }
  };

  const handleActivateFromInvoice = async (invoice: PendingInvoice) => {
    setIsActivating(true);
    try {
      const response = await fetch(`/api/billing/invoice/${invoice.id}/confirm-payment`, {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to activate");
      
      setSelectedInvoice(null);
      fetchSubscriptions();
      fetchPendingInvoices();
      gooeyToast.success("Berhasil!", { description: `Paket ${invoice.plan} diaktifkan untuk ${invoice.organizationName}` });
    } catch (err) {
      console.error("Error activating:", err);
      gooeyToast.error("Gagal", { description: "Tidak dapat mengaktifkan paket" });
    } finally {
      setIsActivating(false);
    }
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === "active").length,
    trial: subscriptions.filter(s => s.status === "trial").length,
    expired: subscriptions.filter(s => s.status === "expired").length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">
          Kelola langganan semua organisasi
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices - Needs Activation */}
      {pendingInvoices.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Wallet className="h-5 w-5" />
                Invoice Lunas - Perlu Aktivasi
              </CardTitle>
              <CardDescription className="text-amber-700">
                {pendingInvoices.length} invoice sudah lunas tapi paket belum aktif
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchPendingInvoices}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.organizationName}</TableCell>
                    <TableCell className="capitalize">{invoice.plan}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Lunas</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Aktifkan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisasi</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada subscription</p>
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => {
                  const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.trial;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <p className="font-medium">{sub.organization.name}</p>
                        <p className="text-xs text-muted-foreground">/{sub.organization.slug}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{PLAN_LABELS[sub.plan] || sub.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(sub.price)}</TableCell>
                      <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                      <TableCell>{formatDate(sub.currentPeriodStart)}</TableCell>
                      <TableCell>{formatDate(sub.currentPeriodEnd)}</TableCell>
                      <TableCell>
                        {sub.status !== "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSub(sub)}
                          >
                            Activate
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

      {/* Activate Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Aktifkan subscription untuk {selectedSub?.organization.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Pilih plan yang ingin diaktifkan:
            </p>
            <div className="flex gap-2">
              <Button
                variant={selectedSub?.plan === "starter" ? "default" : "outline"}
                onClick={() => selectedSub && handleActivate(selectedSub.organization.id, "starter")}
                disabled={isActivating}
              >
                Starter
              </Button>
              <Button
                variant={selectedSub?.plan === "pro" ? "default" : "outline"}
                onClick={() => selectedSub && handleActivate(selectedSub.organization.id, "pro")}
                disabled={isActivating}
              >
                Pro
              </Button>
              <Button
                variant={selectedSub?.plan === "enterprise" ? "default" : "outline"}
                onClick={() => selectedSub && handleActivate(selectedSub.organization.id, "enterprise")}
                disabled={isActivating}
              >
                Enterprise
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate from Invoice Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktivasi Paket</DialogTitle>
            <DialogDescription>
              Aktifkan paket untuk {selectedInvoice?.organizationName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Invoice {selectedInvoice?.invoiceNumber} sudah LUNAS
              </p>
              <p className="text-sm text-green-700 mt-1">
                Klik "Aktifkan" untuk langsung mengaktifkan paket {selectedInvoice?.plan}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedInvoice(null)}
              >
                Batal
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => selectedInvoice && handleActivateFromInvoice(selectedInvoice)}
                disabled={isActivating}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Aktifkan Paket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
