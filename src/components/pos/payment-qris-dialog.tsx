"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

interface PaymentQRISDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName: string;
  onPaymentSuccess?: () => void;
  onPaymentExpired?: () => void;
}

interface PaymentData {
  paymentId?: string;
  transactionId?: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  expiredAt?: string;
}

interface PaymentStatus {
  isPaid: boolean;
  isExpired: boolean;
  paymentStatus: string;
}

export function PaymentQRISDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  amount,
  customerName,
  onPaymentSuccess,
  onPaymentExpired,
}: PaymentQRISDialogProps) {
  const [status, setStatus] = useState<
    "idle" | "creating" | "waiting" | "paid" | "expired" | "error"
  >("idle");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Create payment
  const createPayment = useCallback(async () => {
    setStatus("creating");
    setError(null);

    try {
      // Use public/create API which integrates with Mayar QRIS
      const response = await fetch("/api/payments/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          customerName: customerName || "Pelanggan",
          customerPhone: "08000000000", // Default phone for walk-in customers
          paymentType: "qris",
          expiredInMinutes: 30, // 30 minutes expiration
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      setPaymentData(data);
      setStatus("waiting");

      // Calculate countdown
      if (data.expiredAt) {
        const expiredTime = new Date(data.expiredAt).getTime();
        const now = Date.now();
        const remaining = Math.floor((expiredTime - now) / 1000);
        setCountdown(Math.max(0, remaining));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [orderId]);

  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/payments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data: PaymentStatus = await response.json();

      if (data.isPaid) {
        setStatus("paid");
        gooeyToast.success("Pembayaran berhasil diterima!");
        onPaymentSuccess?.();
      } else if (data.isExpired) {
        setStatus("expired");
        onPaymentExpired?.();
      }
    } catch (err) {
      console.error("Failed to check payment status:", err);
    }
  }, [orderId, onPaymentSuccess, onPaymentExpired]);

  // Initialize payment when dialog opens
  useEffect(() => {
    if (open && status === "idle") {
      createPayment();
    }
  }, [open, status, createPayment]);

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting" || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          onPaymentExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, countdown, onPaymentExpired]);

  // Poll for payment status
  useEffect(() => {
    if (status !== "waiting") return;

    const pollInterval = setInterval(checkPaymentStatus, 3000);
    return () => clearInterval(pollInterval);
  }, [status, checkPaymentStatus]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setPaymentData(null);
      setError(null);
      setCountdown(0);
    }
  }, [open]);

  // Copy payment URL to clipboard
  const copyPaymentUrl = () => {
    if (paymentData?.paymentUrl) {
      navigator.clipboard.writeText(paymentData.paymentUrl);
      gooeyToast.success("Link pembayaran disalin!");
    }
  };

  // Open payment URL in new tab
  const openPaymentUrl = () => {
    if (paymentData?.paymentUrl) {
      window.open(paymentData.paymentUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={status !== "creating"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pembayaran QRIS
          </DialogTitle>
          <DialogDescription>
            {status === "waiting" && (
              <span>Scan QR Code untuk membayar order #{orderNumber}</span>
            )}
            {status === "creating" && <span>Memproses pembayaran...</span>}
            {status === "paid" && <span>Pembayaran berhasil!</span>}
            {status === "expired" && <span>Pembayaran telah kedaluwarsa</span>}
            {status === "error" && <span>Gagal membuat pembayaran</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Amount Display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Pembayaran</p>
            <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
            <p className="text-sm text-muted-foreground">{customerName}</p>
          </div>

          {/* Loading State */}
          {status === "creating" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Membuat kode pembayaran...
              </p>
            </div>
          )}

          {/* QR Code Display */}
          {status === "waiting" && paymentData?.qrCodeUrl && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentData.qrCodeUrl}
                  alt="QRIS Payment QR Code"
                  className="h-48 w-48"
                />
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Berlaku {formatCountdown(countdown)}
              </Badge>
              <p className="text-xs text-muted-foreground text-center max-w-[250px]">
                Buka aplikasi e-wallet atau mobile banking, lalu scan kode QR di atas
              </p>
            </div>
          )}

          {/* Waiting for Payment (no QR, use payment URL) */}
          {status === "waiting" && !paymentData?.qrCodeUrl && paymentData?.paymentUrl && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border bg-muted/50 p-6">
                <QrCode className="h-24 w-24 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Berlaku {formatCountdown(countdown)}
              </Badge>
              <p className="text-xs text-muted-foreground text-center">
                Klik tombol di bawah untuk membuka halaman pembayaran
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyPaymentUrl}>
                  <Copy className="h-4 w-4 mr-1" />
                  Salin Link
                </Button>
                <Button size="sm" onClick={openPaymentUrl}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Buka Pembayaran
                </Button>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "paid" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="font-medium text-green-600">Pembayaran Berhasil!</p>
              <p className="text-sm text-muted-foreground">
                Order #{orderNumber} telah dibayar
              </p>
            </div>
          )}

          {/* Expired State */}
          {status === "expired" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-16 w-16 text-orange-500" />
              <p className="font-medium text-orange-600">Pembayaran Kedaluwarsa</p>
              <p className="text-sm text-muted-foreground text-center">
                Waktu pembayaran telah habis. Silakan buat pembayaran baru.
              </p>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="font-medium text-red-600">Gagal Membuat Pembayaran</p>
              <p className="text-sm text-muted-foreground text-center">
                {error || "Terjadi kesalahan. Silakan coba lagi."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Retry Button for Expired/Error */}
          {(status === "expired" || status === "error") && (
            <Button onClick={createPayment} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-1" />
              Buat Pembayaran Baru
            </Button>
          )}

          {/* Close Button for Success */}
          {status === "paid" && (
            <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Tutup
            </Button>
          )}

          {/* Cancel Button while Waiting */}
          {status === "waiting" && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Bayar Nanti
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
