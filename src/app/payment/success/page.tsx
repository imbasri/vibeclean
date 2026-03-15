"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Home,
  Receipt,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaymentStore } from "@/stores/payment-store";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use Zustand store
  const {
    paymentStatus,
    isChecking,
    currentOrderId,
    currentAmount,
    startChecking,
    setPaymentStatus,
    setPaymentChecked,
    resetChecking,
  } = usePaymentStore();

  const orderId = searchParams.get("orderId");
  const transactionId = searchParams.get("transactionId");

  useEffect(() => {
    console.log("[PaymentSuccess] Page loaded", { orderId, transactionId, paymentStatus });
  }, [orderId, transactionId, paymentStatus]);

  useEffect(() => {
    async function checkPaymentStatus() {
      if (!orderId) {
        console.error("[PaymentSuccess] No orderId provided");
        setHasError(true);
        setErrorMessage("Order ID tidak ditemukan");
        setPaymentStatus("failed");
        return;
      }

      try {
        // Start checking
        if (paymentStatus === "checking" && !isChecking) {
          startChecking();
        }

        console.log("[PaymentSuccess] Checking payment status...", { orderId, transactionId });

        const response = await fetch(`/api/orders/check-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, transactionId }),
        });

        if (!response.ok) {
          console.error("[PaymentSuccess] API response not OK:", response.status);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const orderData = data.order;

        console.log("[PaymentSuccess] Payment check result:", data);

        // Update Zustand store
        setPaymentChecked(orderData);

        if (orderData.isPaid) {
          console.log("[PaymentSuccess] Payment detected as PAID");
          setPaymentStatus("paid");
        } else if (orderData.isExpired) {
          console.log("[PaymentSuccess] Payment EXPIRED");
          setPaymentStatus("expired");
        } else {
          console.log("[PaymentSuccess] Payment still PENDING, will check again...");
        }
      } catch (error) {
        console.error("[PaymentSuccess] Error checking payment status:", error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : "Gagal memeriksa status pembayaran");
        setPaymentStatus("failed");
      }
    }

    checkPaymentStatus();

    // Poll for payment status if still checking
    if (paymentStatus === "checking") {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      return () => {
        console.log("[PaymentSuccess] Cleaning up polling interval");
        clearInterval(interval);
      };
    }
  }, [orderId, transactionId, paymentStatus, isChecking, startChecking, setPaymentStatus, setPaymentChecked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetChecking();
      console.log("[PaymentSuccess] Cleanup complete");
    };
  }, [resetChecking]);

  // Show error state
  if (hasError || paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md border-red-200 shadow-lg">
            <CardHeader className="text-center">
              <AlertCircle className="h-20 w-20 mx-auto text-red-500 mb-4" />
              <CardTitle className="text-2xl text-red-600">Gagal Memuat Order</CardTitle>
              <CardDescription>
                {errorMessage || "Kami tidak dapat menemukan order Anda"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-mono text-xs">
                  Order ID: {orderId || "Tidak tersedia"}
                </p>
                {transactionId && (
                  <p className="font-mono text-xs mt-1">
                    Transaction: {transactionId}
                  </p>
                )}
              </div>
              <p>
                Silakan hubungi dukungan jika Anda sudah melakukan pembayaran.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/orders")}>
                <Receipt className="h-4 w-4 mr-2" />
                Lihat Order Lain
              </Button>
              <Button className="w-full" onClick={() => router.push("/")}>
                <Home className="h-4 w-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show checking state
  if (paymentStatus === "checking" || paymentStatus === "expired") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
              <CardTitle className="text-2xl">Memeriksa Pembayaran</CardTitle>
              <CardDescription>
                Kami sedang memeriksa status pembayaran Anda...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-xs">{orderId}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Harap tunggu sebentar...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md border-green-200 shadow-lg">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-20 w-20 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-2xl text-green-600">Pembayaran Berhasil!</CardTitle>
            <CardDescription>
              Terima kasih atas pembayaran Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentOrderId && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">No. Order</span>
                  <span className="font-medium">{currentOrderId}</span>
                </div>
                {currentAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bayar</span>
                    <span className="font-medium">
                      Rp {currentAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              Pembayaran Anda telah diterima. Order akan segera diproses.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => router.push("/dashboard/orders")}>
              <Receipt className="h-4 w-4 mr-2" />
              Lihat Order Saya
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
              <Home className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

// Main export with Suspense boundary
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
