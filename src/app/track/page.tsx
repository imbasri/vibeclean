"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, type Variants, type Easing } from "framer-motion";
import {
  Search,
  Package,
  Check,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  MapPin,
  Receipt,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, ease: easeOut },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

const statusSteps = [
  { key: "pending", label: "Diterima", icon: Package, description: "Order diterima" },
  { key: "processing", label: "Diproses", icon: Clock, description: "Sedang diproses" },
  { key: "washing", label: "Dicuci", icon: RefreshCw, description: "Sedang dicuci" },
  { key: "drying", label: "Dikeringkan", icon: RefreshCw, description: "Sedang dikeringkan" },
  { key: "ironing", label: "Disetrika", icon: RefreshCw, description: "Sedang disetrika" },
  { key: "ready", label: "Siap", icon: CheckCircle, description: "Siap diambil" },
  { key: "delivered", label: "Dikirim", icon: Truck, description: "Dalam pengiriman" },
  { key: "completed", label: "Selesai", icon: Check, description: "Order selesai" },
];

const statusOrder = ["pending", "processing", "washing", "drying", "ironing", "ready", "delivered", "completed"];

const paymentStatusConfig = {
  unpaid: { label: "Belum Bayar", className: "bg-red-100 text-red-700" },
  partial: { label: "Bayar Sebagian", className: "bg-yellow-100 text-yellow-700" },
  paid: { label: "Lunas", className: "bg-green-100 text-green-700" },
  refunded: { label: "Dikembalikan", className: "bg-gray-100 text-gray-700" },
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer Bank",
  ewallet: "E-Wallet",
};

export function TrackOrderPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialOrderNumber = searchParams.get("order") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [searchType, setSearchType] = useState<"order" | "phone">("order");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    if (initialOrderNumber) {
      handleTrack(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleTrack = async (orderNum: string) => {
    if (!orderNum.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = searchType === "phone" ? "?type=phone" : "";
      const response = await fetch(`/api/track/${encodeURIComponent(orderNum.trim())}${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Order tidak ditemukan");
        setOrderData(null);
      } else {
        setOrderData(data);
        router.replace(`/track?order=${orderNum.trim()}`);
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setOrderData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack(orderNumber);
  };

  const getCurrentStepIndex = () => {
    if (!orderData?.order?.status) return 0;
    const idx = statusOrder.indexOf(orderData.order.status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Lacak Pesanan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Masukkan nomor order untuk melihat status laundry Anda
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col gap-3">
                {/* Search Type Toggle */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant={searchType === "order" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchType("order")}
                    className="flex-1"
                  >
                    Nomor Order
                  </Button>
                  <Button
                    variant={searchType === "phone" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchType("phone")}
                    className="flex-1"
                  >
                    Nomor HP
                  </Button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <Input
                    type="text"
                    placeholder={searchType === "order" ? "Masukkan nomor order (contoh: ORD-20240315-ABCD)" : "Masukkan nomor HP (contoh: 081234567890)"}
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(searchType === "order" ? e.target.value.toUpperCase() : e.target.value)}
                    className="flex-1 h-12 text-lg"
                  />
                  <Button type="submit" size="lg" disabled={isLoading || !orderNumber.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-5 w-5 mr-2" />
                        Lacak
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {orderData && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {orderData.organization?.name || "Laundry"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {orderData.branch?.name}
                    </p>
                  </div>
                  <Badge className={paymentStatusConfig[orderData.order.paymentStatus as keyof typeof paymentStatusConfig]?.className || "bg-gray-100"}>
                    {paymentStatusConfig[orderData.order.paymentStatus as keyof typeof paymentStatusConfig]?.label || orderData.order.paymentStatus}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Status Pesanan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  
                  <div className="space-y-6">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index < currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      const isPending = index > currentStepIndex;
                      const StepIcon = step.icon;

                      return (
                        <motion.div
                          key={step.key}
                          variants={itemVariants}
                          className={`relative flex items-start gap-4 ${
                            isPending ? "opacity-40" : ""
                          }`}
                        >
                          <div
                            className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 ${
                              isCompleted
                                ? "bg-green-500 border-green-200 dark:border-green-800"
                                : isCurrent
                                ? "bg-blue-500 border-blue-200 dark:border-blue-800"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-5 w-5 text-white" />
                            ) : (
                              <StepIcon
                                className={`h-5 w-5 ${
                                  isCurrent ? "text-white" : "text-gray-400"
                                }`}
                              />
                            )}
                          </div>
                          <div className="flex-1 pt-2">
                            <p
                              className={`font-medium ${
                                isCurrent ? "text-blue-600 dark:text-blue-400" : ""
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
                            {isCurrent && orderData.order.estimatedCompletionAt && (
                              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                Estimasi:{" "}
                                {new Date(
                                  orderData.order.estimatedCompletionAt
                                ).toLocaleDateString("id-ID", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Detail Pesanan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nomor Order</p>
                    <p className="font-medium">{orderData.order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Order</p>
                    <p className="font-medium">
                      {new Date(orderData.order.createdAt).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pelanggan</p>
                    <p className="font-medium">{orderData.order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">No. HP</p>
                    <p className="font-medium">{orderData.order.customerPhone}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Item Pesanan</p>
                  <div className="space-y-2">
                    {orderData.order.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.serviceName} ({item.quantity} {item.unit})
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(orderData.order.subtotal)}</span>
                  </div>
                  {orderData.order.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Diskon</span>
                      <span>-{formatCurrency(orderData.order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(orderData.order.total)}</span>
                  </div>
                  {orderData.order.paymentMethod && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Pembayaran</span>
                      <span>
                        {paymentMethodLabels[orderData.order.paymentMethod] ||
                          orderData.order.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                {orderData.order.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Catatan</p>
                      <p className="text-sm">{orderData.order.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {orderData.branch && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Info Outlet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{orderData.branch.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {orderData.branch.address}
                      </p>
                    </div>
                  </div>
                  {orderData.branch.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <a
                        href={`https://wa.me/${orderData.branch.phone.replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {orderData.branch.phone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>Ditenagai oleh VibeClean</p>
        </motion.div>
      </div>
    </div>
  );
}

function TrackOrderWithSuspense() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lacak Pesanan</h1>
            <p className="text-gray-600 dark:text-gray-400">Masukkan nomor order untuk melihat status laundry Anda</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="flex-1 h-12 bg-muted animate-pulse rounded-md" />
                <div className="h-12 w-24 bg-muted animate-pulse rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <TrackOrderPageContent />
    </Suspense>
  );
}

export default function TrackOrderPage() {
  return <TrackOrderWithSuspense />;
}
