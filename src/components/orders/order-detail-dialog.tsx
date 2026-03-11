"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  User,
  Phone,
  Calendar,
  CreditCard,
  QrCode,
  Banknote,
  Wallet,
  ExternalLink,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus, PaymentStatus, PaymentMethod } from "@/types";
import { gooeyToast } from "goey-toast";

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrintReceipt?: () => void;
  onOpenPayment?: () => void;
  onUpdate?: () => void;
}

// Status config for consistent styling
const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700", icon: Clock },
  processing: { label: "Diproses", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700", icon: Package },
  washing: { label: "Dicuci", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700", icon: Package },
  drying: { label: "Dikeringkan", color: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700", icon: Package },
  ironing: { label: "Disetrika", color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700", icon: Package },
  ready: { label: "Siap Ambil", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700", icon: CheckCircle2 },
  delivered: { label: "Diantar", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700", icon: Truck },
  completed: { label: "Selesai", color: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700", icon: XCircle },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: "Belum Bayar", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  partial: { label: "Sebagian", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid: { label: "Lunas", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  refunded: { label: "Refund", color: "bg-muted text-muted-foreground" },
};

const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: React.ElementType }> = {
  cash: { label: "Tunai", icon: Banknote },
  qris: { label: "QRIS", icon: QrCode },
  transfer: { label: "Transfer Bank", icon: CreditCard },
  ewallet: { label: "E-Wallet", icon: Wallet },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.color} border gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status];
  return (
    <Badge className={`${config.color} font-medium`}>
      {config.label}
    </Badge>
  );
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  onPrintReceipt,
  onOpenPayment,
  onUpdate,
}: OrderDetailDialogProps) {
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  if (!order) return null;

  const paymentMethodKey = order.paymentMethod || "cash";
  const paymentMethod = paymentMethodConfig[paymentMethodKey] || paymentMethodConfig.cash;
  const PaymentIcon = paymentMethod.icon;
  
  // Check if order has digital payment info
  const hasDigitalPayment = order.mayarPaymentId || order.paymentUrl;
  const isDigitalPaymentPending = hasDigitalPayment && order.paymentStatus === "unpaid";
  const canMarkAsPaid = order.paymentStatus !== "paid";
  
  // Format payment expiration
  const paymentExpiredAt = order.paymentExpiredAt 
    ? new Date(order.paymentExpiredAt) 
    : null;
  const isPaymentExpired = paymentExpiredAt && paymentExpiredAt < new Date();

  const copyPaymentUrl = () => {
    if (order.paymentUrl) {
      navigator.clipboard.writeText(order.paymentUrl);
      gooeyToast.success("Link pembayaran disalin!");
    }
  };

  const openPaymentUrl = () => {
    if (order.paymentUrl) {
      window.open(order.paymentUrl, "_blank");
    }
  };

  const handlePrint = () => {
    if (order) {
      window.open(`/dashboard/orders/print/${order.id}`, '_blank');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!order) return;
    
    try {
      setIsMarkingPaid(true);
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "paid",
          paidAmount: order.total,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengupdate status");
      }

      gooeyToast.success("Pembayaran ditandai lunas!");
      
      // Call the update callback if provided
      if (onUpdate) {
        onUpdate();
      }
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      gooeyToast.error("Gagal mengupdate status pembayaran");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detail Order #{order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Dibuat pada {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Section */}
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>

          {/* Customer Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Pelanggan</h4>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{order.customerPhone}</span>
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Items</h4>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.serviceName}</span>
                      <span className="text-muted-foreground ml-2">
                        x{item.quantity} {item.unit}
                      </span>
                    </div>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Diskon</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada item</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Pembayaran</h4>
            
            <div className="flex items-center gap-2">
              <PaymentIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{paymentMethod.label}</span>
            </div>

            {/* Digital Payment Info */}
            {hasDigitalPayment && (
              <div className="space-y-2 pt-2">
                {order.mayarTransactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ID Transaksi</span>
                    <span className="font-mono text-xs">{order.mayarTransactionId}</span>
                  </div>
                )}
                
                {order.paidAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dibayar pada</span>
                    <span className="text-green-600 font-medium">
                      {formatDate(order.paidAt)}
                    </span>
                  </div>
                )}

                {isDigitalPaymentPending && !isPaymentExpired && paymentExpiredAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Batas Waktu</span>
                    <span className="text-orange-600">
                      {paymentExpiredAt.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                {isPaymentExpired && order.paymentStatus === "unpaid" && (
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 text-center">
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      Waktu pembayaran telah habis
                    </p>
                  </div>
                )}

                {/* Payment URL Actions */}
                {isDigitalPaymentPending && !isPaymentExpired && order.paymentUrl && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={copyPaymentUrl} className="flex-1">
                      <Copy className="w-4 h-4 mr-1" />
                      Salin Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={openPaymentUrl} className="flex-1">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Buka
                    </Button>
                  </div>
                )}

                {/* QR Code Display */}
                {isDigitalPaymentPending && !isPaymentExpired && order.qrCodeUrl && (
                  <div className="flex justify-center pt-2">
                    <div className="rounded-lg border bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.qrCodeUrl}
                        alt="QRIS Payment QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Estimated Completion */}
          {order.estimatedCompletionAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimasi Selesai:</span>
              <span className="font-medium">
                {new Date(order.estimatedCompletionAt).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">Catatan:</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Print Button */}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Cetak Nota
          </Button>
          
          {/* Show "Tandai Lunas" button for unpaid orders (cash/manual payment) */}
          {canMarkAsPaid && (
            <Button 
              variant="secondary" 
              onClick={handleMarkAsPaid}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Tandai Lunas
            </Button>
          )}
          
          {/* Show "Bayar Sekarang" button for unpaid digital payments */}
          {isDigitalPaymentPending && !isPaymentExpired && onOpenPayment && (
            <Button onClick={onOpenPayment}>
              <QrCode className="w-4 h-4 mr-2" />
              Bayar Sekarang
            </Button>
          )}
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
