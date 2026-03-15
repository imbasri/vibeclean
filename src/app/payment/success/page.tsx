"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Home,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaymentStore } from "@/stores/payment-store";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
    async function checkPaymentStatus() {
      if (!orderId) {
        setPaymentStatus("failed");
        return;
      }

      try {
        // Start checking
        if (paymentStatus === "checking" && !isChecking) {
          startChecking();
        }

        const response = await fetch(`/api/orders/check-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, transactionId }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const orderData = data.order;
          
          // Update Zustand store
          setPaymentChecked(orderData);
          
          if (orderData.isPaid) {
            setPaymentStatus("paid");
          } else if (orderData.isExpired) {
            setPaymentStatus("expired");
          }
          // else keep checking
        } else {
          setPaymentStatus("failed");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setPaymentStatus("failed");
      }
    }

    checkPaymentStatus();

    // Poll for payment status if still checking
    if (paymentStatus === "checking") {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [orderId, transactionId, paymentStatus, isChecking, startChecking, setPaymentStatus, setPaymentChecked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetChecking();
    };
  }, [resetChecking]);

  // Map Zustand paymentStatus to display state
  const displayState = paymentStatus === "paid" ? "success" : paymentStatus === "expired" || paymentStatus === "failed" ? "failed" : "checking";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {displayState === "checking" && (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
              <CardTitle className="text-2xl">Memeriksa Pembayaran</CardTitle>
              <CardDescription>
                Kami sedang memeriksa status pembayaran Anda...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <p>Harap tunggu sebentar</p>
            </CardContent>
          </Card>
        )}

        {displayState === "success" && (
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
        )}

        {displayState === "failed" && (
          <Card className="w-full max-w-md border-red-200 shadow-lg">
            <CardHeader className="text-center">
              <XCircle className="h-20 w-20 mx-auto text-red-500 mb-4" />
              <CardTitle className="text-2xl text-red-600">Gagal Memuat Order</CardTitle>
              <CardDescription>
                Kami tidak dapat menemukan order Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <p>
                Order ID: {orderId || "Tidak tersedia"}
              </p>
              <p className="mt-2">
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
        )}
      </motion.div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    paid: { color: "bg-green-100 text-green-800", label: "Lunas" },
    unpaid: { color: "bg-red-100 text-red-800", label: "Belum Bayar" },
    partial: { color: "bg-yellow-100 text-yellow-800", label: "Sebagian" },
  };

  const { color, label } = config[status] || config.unpaid;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// Main export with Suspense boundary
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
