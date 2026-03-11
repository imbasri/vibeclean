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
} from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
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

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

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
    } catch (err) {
      console.error("Error activating:", err);
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
    </div>
  );
}
