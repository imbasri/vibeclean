"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface ReceiptData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    serviceName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  discountType?: "percentage" | "fixed";
  discountReason?: string;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  branchName: string;
  branchPhone: string;
  estimatedCompletionAt: Date;
  createdAt: Date;
}

interface ReceiptPrintProps {
  data: ReceiptData;
  onClose: () => void;
}

export function ReceiptPrint({ data, onClose }: ReceiptPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePrint = () => {
    // Create a new window with only the receipt content for printing
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      // Fallback to regular print if popup is blocked
      window.print();
      return;
    }

    // Get the HTML content
    const htmlContent = printContent.innerHTML;

    // Write the content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${data.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .py-4 { padding-top: 16px; padding-bottom: 16px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .border-t { border-top: 1px solid #ddd; }
            .border-b { border-bottom: 1px solid #ddd; }
            .border-dashed { border-style: dashed; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 8px 4px; }
            th { border-bottom: 1px solid #ddd; }
            .text-right { text-align: right; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .font-bold { font-weight: bold; }
            .font-medium { font-weight: 500; }
            .text-gray-500 { color: #666; }
            .text-gray-400 { color: #999; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:bg-white">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible">
        {/* Receipt Content */}
        <div ref={printRef} className="p-6 print:p-0">
          {/* Header */}
          <div className="text-center mb-6 print:mb-4">
            <h1 className="text-xl font-bold print:text-lg">{data.branchName}</h1>
            <p className="text-sm text-gray-500 mt-1">{data.branchPhone}</p>
          </div>

          {/* Order Info */}
          <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4">
            <div className="flex justify-between text-sm">
              <span>No. Order</span>
              <span className="font-medium">{data.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Tanggal</span>
              <span>{new Date(data.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Pelanggan</span>
              <span>{data.customerName}</span>
            </div>
          </div>

          {/* Items */}
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Layanan</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Harga</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2">
                      <div>{item.serviceName}</div>
                      <div className="text-xs text-gray-400">
                        {formatCurrency(item.pricePerUnit)}/{item.unit}
                      </div>
                    </td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatCurrency(item.pricePerUnit)}</td>
                    <td className="text-right py-2">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-300 pt-4 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Diskon {data.discountType === "percentage" ? `(${data.discount}%)` : ""}</span>
                <span>-{formatCurrency(data.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-200">
              <span>TOTAL</span>
              <span>{formatCurrency(data.total)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>Pembayaran</span>
              <span className="capitalize">{data.paymentMethod}</span>
            </div>
            {data.paymentMethod !== "cash" && (
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <span className="text-orange-600">Menunggu Pembayaran</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500">
            <p>Estimasi Selesai:</p>
            <p className="font-medium">
              {new Date(data.estimatedCompletionAt).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </p>
            <p className="mt-4">Terima kasih telah menggunakan</p>
            <p className="font-medium">VibeClean Laundry</p>
          </div>
        </div>

        {/* Action Buttons (hidden when printing) */}
        <div className="flex gap-2 p-4 border-t print:hidden">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Tutup
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Cetak
          </Button>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:max-w-none,
          .print\\:max-w-none * {
            visibility: visible;
          }
          .print\\:max-w-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

interface ReceiptDataInput {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    serviceName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  discountType?: "percentage" | "fixed";
  discountReason?: string;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  branchName?: string;
  branchPhone?: string;
  estimatedCompletionAt: Date;
  createdAt?: Date;
}

export function openReceiptWindow(data: ReceiptDataInput): void {
  // Instead of opening new tab, trigger browser print with proper styling
  // This will use the ReceiptPrint component which is already in the POS
  
  // Dispatch custom event to open receipt print in POS
  const event = new CustomEvent("open-receipt-print", { detail: data });
  window.dispatchEvent(event);
}
