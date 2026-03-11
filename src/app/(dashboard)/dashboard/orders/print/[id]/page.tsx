"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Order, OrderStatus } from "@/types";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Menunggu",
  processing: "Diproses",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  ready: "Siap Ambil",
  delivered: "Diantar",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function PrintOrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch order");
        }
        
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  useEffect(() => {
    if (order && !loading) {
      // Auto print when order is loaded
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [order, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Order not found"}</p>
        <Button variant="outline" onClick={() => window.close()}>
          Tutup
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 print:p-0">
      {/* Print button for screen */}
      <div className="fixed bottom-4 right-4 gap-2 print:hidden flex">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Cetak
        </Button>
      </div>

      {/* Receipt Content */}
      <div className="max-w-md mx-auto bg-white border rounded-lg p-6 print:border-none print:p-0">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold">VibeClean</h1>
          <p className="text-sm text-muted-foreground">Laundry Service</p>
        </div>

        {/* Order Info */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">No. Order</span>
            <span className="font-mono font-medium">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Tanggal</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{statusLabels[order.status]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pembayaran</span>
            <span className="font-medium">{order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "partial" ? "Sebagian" : "Belum Bayar"}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="border-t pt-4 mb-4">
          <h3 className="font-medium mb-2">Pelanggan</h3>
          <p>{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
        </div>

        {/* Items */}
        <div className="border-t pt-4 mb-4">
          <h3 className="font-medium mb-2">Detail Order</h3>
          <div className="space-y-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span>{item.serviceName}</span>
                  <span className="text-muted-foreground ml-2">
                    x{item.quantity} {item.unit}
                  </span>
                </div>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between mb-2 text-green-600">
              <span>Diskon</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-4 text-center text-sm text-muted-foreground">
          <p>Terima kasih atas kepercayaan Anda!</p>
          <p className="mt-1">Simpan struk ini sebagai bukti</p>
        </div>
      </div>
    </div>
  );
}
