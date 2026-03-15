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
  const [pollingCount, setPollingCount] = useState(0);

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

  // Max polling: 100 times (5 minutes with 3s interval)
  const MAX_POLLING_COUNT = 100;

  useEffect(() => {
    console.log("[PaymentSuccess] Page loaded", { orderId, transactionId, paymentStatus, pollingCount });
  }, [orderId, transactionId, paymentStatus, pollingCount]);

  useEffect(() => {
    async function checkPaymentStatus() {
      // Stop if already paid
      if (paymentStatus === "paid") {
        console.log("[PaymentSuccess] Payment already confirmed, stopping polling");
        return;
      }

      // Stop if failed or expired
      if (paymentStatus === "failed" || paymentStatus === "expired") {
        console.log("[PaymentSuccess] Payment failed/expired, stopping polling");
        return;
      }

      // Stop if no orderId
      if (!orderId) {
        console.error("[PaymentSuccess] No orderId provided");
        setHasError(true);
        setErrorMessage("Order ID tidak ditemukan");
        setPaymentStatus("failed");
        return;
      }

      // Stop if max polling reached (5 minutes)
      if (pollingCount >= MAX_POLLING_COUNT) {
        console.log("[PaymentSuccess] Max polling reached, stopping");
        setHasError(true);
        setErrorMessage("Waktu pemeriksaan habis. Silakan cek status order di dashboard.");
        setPaymentStatus("failed");
        return;
      }

      try {
        // Start checking
        if (paymentStatus === "checking" && !isChecking) {
          startChecking();
        }

        console.log(`[PaymentSuccess] Checking payment (${pollingCount + 1}/${MAX_POLLING_COUNT})...`, { orderId });

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
          console.log("[PaymentSuccess] ✓ Payment detected as PAID - stopping polling");
          setPaymentStatus("paid");
          // Stop polling - payment successful
          return;
        } else if (orderData.isExpired) {
          console.log("[PaymentSuccess] ✗ Payment EXPIRED - stopping polling");
          setPaymentStatus("expired");
          // Stop polling - payment expired
          return;
        } else {
          console.log(`[PaymentSuccess] Payment still PENDING, will check again... (${pollingCount + 1}/${MAX_POLLING_COUNT})`);
        }
      } catch (error) {
        console.error("[PaymentSuccess] Error checking payment status:", error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : "Gagal memeriksa status pembayaran");
        setPaymentStatus("failed");
        // Stop polling on error
        return;
      }

      // Increment polling count
      setPollingCount(prev => prev + 1);
    }

    // Only poll if checking
    if (paymentStatus === "checking") {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      return () => {
        console.log("[PaymentSuccess] Cleaning up polling interval");
        clearInterval(interval);
      };
    }
  }, [orderId, transactionId, paymentStatus, isChecking, pollingCount, startChecking, setPaymentStatus, setPaymentChecked]);

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
    const [isManuallyChecking, setIsManuallyChecking] = useState(false);

    const handleManualCheck = async () => {
      setIsManuallyChecking(true);
      try {
        console.log("[Manual Check] Force checking payment status...");
        
        const response = await fetch(`/api/payments/force-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, transactionId }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("[Manual Check] Force check result:", data);

          if (data.order.isPaid) {
            setPaymentStatus("paid");
            setPaymentChecked(data.order);
          }
        }
      } catch (error) {
        console.error("[Manual Check] Error:", error);
      } finally {
        setIsManuallyChecking(false);
      }
    };

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
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 inline mr-1 mb-0.5" />
                <p>
                  Jika Anda sudah membayar tapi status tidak berubah, klik tombol di bawah untuk memeriksa secara manual.
                </p>
              </div>
              <Button 
                onClick={handleManualCheck} 
                disabled={isManuallyChecking}
                className="w-full"
              >
                {isManuallyChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memeriksa...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Periksa Status Manual
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Polling otomatis: {pollingCount + 1}/{MAX_POLLING_COUNT}
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
