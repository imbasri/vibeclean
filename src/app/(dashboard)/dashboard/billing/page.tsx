"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, type Variants, type Easing } from "framer-motion";
import {
  CreditCard,
  Check,
  Crown,
  Zap,
  Building2,
  Shield,
  Download,
  Clock,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Wallet,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGuard } from "@/components/common/permission-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";
import { useBilling } from "@/hooks/use-billing";

// Animation config
const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

// Plan configurations - Updated to match PRD pricing
const plans: {
  id: SubscriptionPlan;
  name: string;
  price: number;
  description: string;
  icon: React.ElementType;
  color: string;
  popular?: boolean;
  isFree?: boolean;
  features: string[];
  limits: {
    branches: number | "Unlimited";
    staff: number | "Unlimited";
    orders: number | "Unlimited";
  };
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0, // GRATIS sesuai PRD
    description: "Cocok untuk laundry baru dengan 1 cabang",
    icon: Zap,
    color: "from-blue-500 to-blue-600",
    isFree: true,
    features: [
      "1 Cabang",
      "3 Staff/Cabang",
      "100 Order/bulan", // Updated sesuai PRD
      "Laporan dasar",
      "Notifikasi WhatsApp",
      "POS Kasir",
      "QRIS & VA Mayar",
    ],
    limits: {
      branches: 1,
      staff: 3,
      orders: 100, // Updated sesuai PRD
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 149000, // Rp 149.000 sesuai PRD
    description: "Untuk laundry berkembang dengan multiple cabang",
    icon: Crown,
    color: "from-purple-500 to-purple-600",
    popular: true,
    features: [
      "5 Cabang",
      "10 Staff/Cabang",
      "Unlimited Order",
      "Laporan lengkap",
      "Notifikasi WhatsApp",
      "POS Kasir + Kurir",
      "Kupon & Paket Member",
      "WhatsApp Group Support",
    ],
    limits: {
      branches: 5,
      staff: 10,
      orders: "Unlimited",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: -1, // Custom pricing
    description: "Untuk bisnis laundry skala besar",
    icon: Building2,
    color: "from-amber-500 to-amber-600",
    features: [
      "Unlimited Cabang",
      "Unlimited Staff",
      "Unlimited Order",
      "Laporan analytics",
      "Notifikasi WhatsApp + Email",
      "Custom Domain",
      "Dedicated Payment Gateway",
      "Dedicated Manager",
      "SLA 99.9%",
    ],
    limits: {
      branches: "Unlimited",
      staff: "Unlimited",
      orders: "Unlimited",
    },
  },
];

function BillingContent() {
  const { data, isLoading, error, refetch, subscribeToPlan, isSubscribing } = useBilling();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // All hooks must be called before any early returns
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for payment success - must be called unconditionally
  useEffect(() => {
    if (!mounted) return;
    const success = searchParams.get("success");
    if (success === "true") {
      gooeyToast.success("Pembayaran Berhasil", { description: "Terima kasih atas pembayaran Anda!" });
      refetch();
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, [searchParams, refetch, mounted]);

  // Auto-check for paid invoices with inactive subscription on mount
  useEffect(() => {
    if (!mounted || !data?.invoices || !data?.subscription) return;
    const paidInvoices = data.invoices.filter(inv => inv.status === "paid");
    const hasInactiveSubscription = data.subscription.status !== "active" && data.subscription.status !== "trial";

    if (paidInvoices.length > 0 && hasInactiveSubscription) {
      gooeyToast.warning("Subscription Belum Aktif", {
        description: "Klik tombol refresh pada invoice yang sudah lunas untuk aktivasi",
        duration: 8000,
      });
    }
  }, [data, mounted]);

  // Auto-polling state for subscription payment
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  // Auto-polling for subscription payment
  useEffect(() => {
    if (!pendingInvoiceId || !mounted) return;

    const maxPolling = 60; // Max 60 checks (about 3 minutes)
    
    if (pollingCount >= maxPolling) {
      gooeyToast.warning("Waktu habis", { description: "Silakan periksa manual status pembayaran Anda" });
      setPendingInvoiceId(null);
      setPollingCount(0);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/billing/invoice/${pendingInvoiceId}/check-payment`, {
          method: "POST",
        });
        const result = await response.json();
        
        if (result.success && result.paid) {
          gooeyToast.success("Pembayaran Dikonfirmasi!", { 
            description: `Paket berhasil diaktifkan!` 
          });
          setPendingInvoiceId(null);
          setPollingCount(0);
          refetch();
        } else {
          setPollingCount(prev => prev + 1);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setPollingCount(prev => prev + 1);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pendingInvoiceId, pollingCount, mounted, refetch]);

  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [invoiceToPay, setInvoiceToPay] = useState<{id: string, amount: number, plan: string} | null>(null);

  // Early return after all hooks
  if (!mounted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // Function to check payment status manually
  const checkPaymentStatus = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${invoiceId}/check-payment`, {
        method: "POST",
      });
      const result = await response.json();
      
      if (result.success) {
        if (result.paid) {
          gooeyToast.success("Pembayaran Dikonfirmasi!", { description: `Invoice ${result.invoiceNumber} telah lunas.` });
        } else {
          gooeyToast.info("Menunggu Pembayaran", { description: result.message || "Status masih pending." });
        }
        refetch();
      } else {
        gooeyToast.error("Gagal", { description: result.error || "Tidak dapat memeriksa pembayaran" });
      }
    } catch (err) {
      gooeyToast.error("Error", { description: "Terjadi kesalahan saat memeriksa pembayaran" });
    }
  };

  // Manual activate subscription (for when payment was made outside system)

  // Only manual refresh - no auto-refresh to avoid blinking
  // User can manually click refresh button

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${invoiceId}/payment-link`, {
        method: "GET",
      });
      const result = await response.json();
      
      if (result.success && result.paymentUrl) {
        // Open payment in new tab
        window.open(result.paymentUrl, "_blank");
        
        // Set pending invoice for auto-polling
        setPendingInvoiceId(invoiceId);
        setPollingCount(0);
        
        gooeyToast.info("Memulai Polling", {
          description: "Halaman pembayaran telah dibuka. Sistem akan otomatis memeriksa status pembayaran.",
          duration: 5000,
        });
      } else {
        gooeyToast.error("Gagal", { description: result.error || "Tidak dapat membuat link pembayaran" });
      }
    } catch (err) {
      gooeyToast.error("Error", { description: "Terjadi kesalahan saat membuat link pembayaran" });
    }
  };

  const handleUpgrade = (planId: SubscriptionPlan) => {
    setSelectedPlan(planId);
    setIsUpgradeDialogOpen(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;

    const result = await subscribeToPlan(selectedPlan, "monthly");

    if (result.success) {
      if (result.requiresPayment && result.paymentUrl) {
        // Open payment URL in new tab
        window.open(result.paymentUrl, "_blank");
        
        // Set pending invoice for auto-polling
        if (result.invoiceId) {
          setPendingInvoiceId(result.invoiceId);
          setPollingCount(0);
        }
        
        setPaymentUrl(result.paymentUrl);
        setPaymentDialogOpen(true);
        gooeyToast.success("Invoice Dibuat", {
          description: `Silakan lakukan pembayaran. Halaman pembayaran telah dibuka di tab baru.`
        });
      } else {
        // Free plan activated
        const plan = plans.find((p) => p.id === selectedPlan);
        gooeyToast.success("Paket Diaktifkan", {
          description: result.message || `Anda telah beralih ke paket ${plan?.name}!`
        });
      }
    } else {
      gooeyToast.error("Gagal Upgrade", {
        description: result.error || "Terjadi kesalahan saat upgrade"
      });
    }

    setIsUpgradeDialogOpen(false);
  };

  // Sync subscription status for paid invoices
  const syncSubscriptionStatus = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${invoiceId}/manual-activate`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        gooeyToast.success("Subscription Disinkronkan!", {
          description: "Status subscription telah diperbarui",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        gooeyToast.error("Gagal Sync", {
          description: result.error || "Subscription sudah aktif",
        });
      }
    } catch (error) {
      gooeyToast.error("Error", {
        description: "Gagal menyinkronkan status subscription",
      });
    }
  };

  // Force activate subscription for paid invoices
  const handleForceActivate = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${invoiceId}/force-activate`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        gooeyToast.success(result.message || "Paket Pro berhasil diaktifkan!", {
          description: "Mengalihkan ke dashboard...",
        });
        // Redirect to dashboard after successful activation
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } else {
        gooeyToast.error("Gagal Activate", {
          description: result.error || "Invoice belum lunas atau error",
        });
      }
    } catch (error) {
      gooeyToast.error("Error", {
        description: "Gagal mengaktifkan subscription",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat informasi billing...</p>
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
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Gagal Memuat Billing</h3>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
            </div>
            <Button onClick={() => refetch()} variant="outline">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Data Tidak Tersedia</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Tidak dapat memuat informasi billing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { subscription, usage, invoices } = data;
  const currentPlan = subscription.plan;
  const currentPlanData = plans.find((p) => p.id === currentPlan) || plans[0];
  const nextBillingDate = new Date(subscription.nextBillingDate);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary" className="text-green-700 dark:text-green-400">Aktif</Badge>;
      case "trial":
        return <Badge variant="secondary" className="text-blue-700 dark:text-blue-400">Trial</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "cancelled":
        return <Badge variant="outline">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <PermissionGuard allowedRoles={["owner"]} fallback={
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Akses Terbatas</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Hanya owner yang dapat mengakses billing dan subscription. 
          Hubungi owner untuk informasi lebih lanjut.
        </p>
      </div>
    }>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">Kelola langganan dan pembayaran Anda</p>
        </motion.div>

        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        >
          <Card className="overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${currentPlanData.color}`} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Paket {currentPlanData.name}</CardTitle>
                    {getStatusBadge(subscription.status)}
                  </div>
                  <CardDescription className="mt-1">
                    {currentPlanData.description}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {currentPlan === "starter" ? "GRATIS" : formatCurrency(currentPlanData.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">/bulan</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Renewal Info */}
               <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {subscription.status === "trial" ? "Trial Berakhir" : "Perpanjangan Berikutnya"}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatDate(nextBillingDate)}</p>
                    </div>
                  </div>
                <Badge variant="outline">{subscription.daysUntilRenewal} hari lagi</Badge>
              </div>

              {/* Usage Stats */}
              <div className="space-y-4">
                <h4 className="font-semibold">Penggunaan Bulan Ini</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cabang</span>
                        <span className="font-medium">
                          {usage.branches.used} / {usage.branches.limit}
                        </span>
                      </div>
                    <Progress 
                      value={typeof usage.branches.limit === "number" ? usage.branches.percentage : 0} 
                      className="h-2" 
                    />
                  </div>
                  <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Staff</span>
                        <span className="font-medium">
                          {usage.staff.used} / {usage.staff.limit}
                        </span>
                      </div>
                    <Progress 
                      value={typeof usage.staff.limit === "number" ? usage.staff.percentage : 0} 
                      className="h-2" 
                    />
                  </div>
                  <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Order</span>
                        <span className="font-medium">
                          {usage.orders.used.toLocaleString()} / {
                            typeof usage.orders.limit === "number" 
                              ? usage.orders.limit.toLocaleString() 
                              : usage.orders.limit
                          }
                        </span>
                      </div>
                    <Progress 
                      value={typeof usage.orders.limit === "number" ? usage.orders.percentage : 0}
                      className="h-2"
                    />
                    {typeof usage.orders.limit === "number" && usage.orders.percentage > 80 && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Mendekati batas kuota</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Available Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
        >
                  <h2 className="text-xl font-semibold mb-4">Paket Langganan</h2>
                   <div className="grid md:grid-cols-3 gap-6 items-stretch">
                    {plans.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === currentPlan;
              const currentPlanIndex = plans.findIndex((p) => p.id === currentPlan);
              const isDowngrade = currentPlanIndex > index;
              
              return (
                <motion.div
                  key={plan.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className={`group relative flex flex-col h-full ${plan.popular ? "border-purple-500 border-2" : ""} ${isCurrentPlan ? "bg-muted" : ""}`}>
                    {plan.popular && (
                      <div className="absolute top-3 right-3 z-20">
                        <Badge className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 animate-pulse">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Populer
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                       <div className={`mx-auto p-3 rounded-2xl bg-gradient-to-br ${plan.color} text-white mb-2 transform transition-transform group-hover:scale-105`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="mt-2">
                        {plan.isFree ? (
                          <>
                            <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-400">GRATIS</span>
                            <p className="text-sm text-muted-foreground mt-1">Selamanya</p>
                          </>
                        ) : plan.price === -1 ? (
                          <>
                            <span className="text-2xl font-bold">Hubungi Kami</span>
                            <p className="text-sm text-muted-foreground mt-1">Custom pricing</p>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                            <span className="text-muted-foreground">/bulan</span>
                          </>
                        )}
                      </div>
                      <CardDescription className="mt-2 text-muted-foreground">{plan.description}</CardDescription>
                    </CardHeader>
                      <CardContent>
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <span className={`p-1 rounded-md bg-gradient-to-r ${plan.color} text-white inline-flex`}>
                              <Check className="h-4 w-4" />
                            </span>
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="mt-auto">
                      {isCurrentPlan ? (
                        <Button className="w-full" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Paket Saat Ini
                        </Button>
                      ) : plan.id === "enterprise" ? (
                        <Button 
                          className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90`}
                          onClick={() => window.open("https://wa.me/6281234567890?text=Halo, saya tertarik dengan paket Enterprise VibeClean", "_blank")}
                        >
                          Hubungi Sales
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : isDowngrade ? (
                        <Button className="w-full" variant="outline" disabled>
                          Downgrade
                        </Button>
                      ) : (
                        <Button 
                          className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90`}
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={isSubscribing}
                        >
                         {isSubscribing ? (
                             <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                           ) : (
                            <>
                              {plan.isFree ? "Mulai Gratis" : "Upgrade"}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

{/* Invoice History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: easeOut }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  Riwayat Invoice
                </CardTitle>
                <CardDescription className="text-muted-foreground">Daftar invoice dan pembayaran</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <Loader2 className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Periode Billing</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {invoice.periodStart ? formatDate(new Date(invoice.periodStart)) : '-'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              s/d {invoice.periodEnd ? formatDate(new Date(invoice.periodEnd)) : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{invoice.plan}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell className="text-center">
                          {invoice.status === "paid" && (
                            <Badge className="bg-green-100 text-foreground">Lunas</Badge>
                          )}
                          {invoice.status === "pending" && pendingInvoiceId === invoice.id && (
                            <div className="flex items-center justify-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-xs text-primary">Menunggu...</span>
                            </div>
                          )}
                          {invoice.status === "pending" && pendingInvoiceId !== invoice.id && (
                            <Badge className="bg-amber-100 text-primary">Pending</Badge>
                          )}
                          {invoice.status === "failed" && (
                            <Badge className="bg-red-100 text-destructive">Gagal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {invoice.status === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 bg-green-600 hover:bg-green-700"
                                  onClick={() => handlePayInvoice(invoice.id)}
                                >
                                  <Wallet className="h-3 w-3 mr-1" />
                                  Bayar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                  title="Periksa Status Pembayaran"
                                  onClick={() => checkPaymentStatus(invoice.id)}
                                >
                                  <Loader2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {invoice.status === "paid" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-green-600"
                                  disabled
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Lunas
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                  title="Aktifkan Paket Pro (Auto Refresh)"
                                  onClick={() => handleForceActivate(invoice.id)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                   <div className="text-center py-8 text-muted-foreground">
                   <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                   <p>Belum ada riwayat invoice</p>
                   <p className="text-sm mt-1">Invoice akan muncul setelah pembayaran pertama</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: easeOut }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Metode Pembayaran
              </CardTitle>
              <CardDescription>Kelola metode pembayaran Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                 <div className="p-2 bg-muted rounded-lg">
                     <CreditCard className="h-6 w-6 text-primary" />
                   </div>
                  <div>
                    <p className="font-medium">QRIS / Virtual Account</p>
                    <p className="text-sm text-muted-foreground">Powered by Mayar</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-foreground border-foreground/20">
                  <Shield className="h-3 w-3 mr-1 text-foreground" />
                  Secure
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Pembayaran diproses melalui Mayar Payment Gateway. Anda akan menerima invoice 
                setiap bulan via email dan WhatsApp.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upgrade Confirmation Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Konfirmasi Upgrade</DialogTitle>
              <DialogDescription>
                Anda akan upgrade ke paket {plans.find((p) => p.id === selectedPlan)?.name}. 
                Perbedaan biaya akan diprorata untuk sisa periode langganan Anda.
              </DialogDescription>
            </DialogHeader>
            {selectedPlan && (
               <div className="py-4">
                 <div className="p-4 bg-muted rounded-lg space-y-2">
                   <div className="flex justify-between">
                     <span className="text-muted-foreground">Paket Baru</span>
                     <span className="font-medium">{plans.find((p) => p.id === selectedPlan)?.name}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-muted-foreground">Harga/bulan</span>
                     <span className="font-medium">
                       {plans.find((p) => p.id === selectedPlan)?.isFree 
                         ? "GRATIS" 
                         : formatCurrency(plans.find((p) => p.id === selectedPlan)?.price || 0)}
                     </span>
                   </div>
                 </div>
               </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={confirmUpgrade} disabled={isSubscribing}>
                {isSubscribing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Konfirmasi Upgrade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog - Shows Mayar payment link */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pembayaran Subscription
              </DialogTitle>
              <DialogDescription>
                Invoice telah dibuat. Silakan lakukan pembayaran untuk mengaktifkan paket Anda.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div className="p-4 bg-muted/60 rounded-lg border border-muted/40">
                 <p className="text-sm text-primary mb-3">
                  Klik tombol di bawah untuk membuka halaman pembayaran. Anda dapat membayar menggunakan:
                </p>
                <ul className="text-sm text-primary space-y-1 ml-4 list-disc">
                  <li>QRIS (Scan dengan aplikasi e-wallet)</li>
                  <li>Virtual Account (Transfer Bank)</li>
                </ul>
              </div>
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-foreground" />
                    <span>Pembayaran aman & terenkripsi via Mayar</span>
                  </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setPaymentUrl(null);
                }}
              >
                Bayar Nanti
              </Button>
              <Button 
                onClick={() => {
                  if (paymentUrl) {
                    window.open(paymentUrl, "_blank");
                  }
                  setPaymentDialogOpen(false);
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Bayar Sekarang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

import { Suspense } from "react";

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
