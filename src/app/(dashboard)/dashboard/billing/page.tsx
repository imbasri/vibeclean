"use client";

import { useState } from "react";
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

export default function BillingPage() {
  const { data, isLoading, error, refetch, subscribeToPlan, isSubscribing } = useBilling();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handleUpgrade = (planId: SubscriptionPlan) => {
    setSelectedPlan(planId);
    setIsUpgradeDialogOpen(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;
    
    const result = await subscribeToPlan(selectedPlan, "monthly");
    
    if (result.success) {
      if (result.requiresPayment && result.paymentUrl) {
        // Open payment URL in new tab or show payment dialog
        setPaymentUrl(result.paymentUrl);
        setPaymentDialogOpen(true);
        gooeyToast.success("Invoice Dibuat", { 
          description: `Silakan lakukan pembayaran untuk aktivasi paket.` 
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

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-500">Memuat informasi billing...</p>
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
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Gagal Memuat Billing</h3>
              <p className="text-gray-500 text-sm mt-1">{error}</p>
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
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Data Tidak Tersedia</h3>
              <p className="text-gray-500 text-sm mt-1">
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
        return <Badge className="bg-green-100 text-green-700">Aktif</Badge>;
      case "trial":
        return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-700">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <PermissionGuard allowedRoles={["owner"]} fallback={
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <CreditCard className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Akses Terbatas</h2>
        <p className="text-gray-500 mt-2 max-w-md">
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
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-500 mt-1">Kelola langganan dan pembayaran Anda</p>
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
                  <p className="text-3xl font-bold">{formatCurrency(subscription.price)}</p>
                  <p className="text-sm text-gray-500">/bulan</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Renewal Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {subscription.status === "trial" ? "Trial Berakhir" : "Perpanjangan Berikutnya"}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(nextBillingDate)}</p>
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
                      <span className="text-gray-500">Cabang</span>
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
                      <span className="text-gray-500">Staff</span>
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
                      <span className="text-gray-500">Order</span>
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
                      <div className="flex items-center gap-1 text-xs text-amber-600">
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
          <div className="grid md:grid-cols-3 gap-6">
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
                  <Card className={`relative h-full ${plan.popular ? "border-purple-500 border-2" : ""} ${isCurrentPlan ? "bg-gray-50" : ""}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-purple-500 text-white">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Populer
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <div className={`mx-auto p-3 rounded-xl bg-gradient-to-br ${plan.color} text-white mb-2`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="mt-2">
                        {plan.isFree ? (
                          <>
                            <span className="text-3xl font-bold text-green-600">GRATIS</span>
                            <p className="text-sm text-gray-500 mt-1">Selamanya</p>
                          </>
                        ) : plan.price === -1 ? (
                          <>
                            <span className="text-2xl font-bold">Hubungi Kami</span>
                            <p className="text-sm text-gray-500 mt-1">Custom pricing</p>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                            <span className="text-gray-500">/bulan</span>
                          </>
                        )}
                      </div>
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
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
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-gray-500" />
                Riwayat Invoice
              </CardTitle>
              <CardDescription>Daftar invoice dan pembayaran</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{formatDate(new Date(invoice.date))}</TableCell>
                        <TableCell>{invoice.plan}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell className="text-center">
                          {invoice.status === "paid" && (
                            <Badge className="bg-green-100 text-green-700">Lunas</Badge>
                          )}
                          {invoice.status === "pending" && (
                            <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                          )}
                          {invoice.status === "failed" && (
                            <Badge className="bg-red-100 text-red-700">Gagal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => gooeyToast.success("Download", { description: "Invoice sedang diunduh..." })}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
                <CreditCard className="h-5 w-5 text-gray-500" />
                Metode Pembayaran
              </CardTitle>
              <CardDescription>Kelola metode pembayaran Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">QRIS / Virtual Account</p>
                    <p className="text-sm text-gray-500">Powered by Mayar</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-4">
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
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paket Baru</span>
                    <span className="font-medium">{plans.find((p) => p.id === selectedPlan)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Harga/bulan</span>
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
                <CreditCard className="h-5 w-5 text-blue-600" />
                Pembayaran Subscription
              </DialogTitle>
              <DialogDescription>
                Invoice telah dibuat. Silakan lakukan pembayaran untuk mengaktifkan paket Anda.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-3">
                  Klik tombol di bawah untuk membuka halaman pembayaran. Anda dapat membayar menggunakan:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                  <li>QRIS (Scan dengan aplikasi e-wallet)</li>
                  <li>Virtual Account (Transfer Bank)</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="h-4 w-4 text-green-500" />
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
