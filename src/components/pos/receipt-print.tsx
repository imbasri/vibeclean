"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    // Auto-print when component mounts
    const timer = setTimeout(() => {
      if (printRef.current) {
        window.print();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    onClose();
  };

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
  const receiptData: ReceiptData = {
    ...data,
    branchName: data.branchName || "VibeClean Laundry",
    branchPhone: data.branchPhone || "-",
    estimatedCompletionAt: data.estimatedCompletionAt,
    createdAt: data.createdAt || new Date(),
  };

  // Open a new window with the receipt
  const printWindow = window.open("", "_blank", "width=400,height=600");
  
  if (!printWindow) {
    alert("Please allow popups to print receipts");
    return;
  }

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receiptData.orderNumber}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px; 
          max-width: 300px; 
          margin: 0 auto;
          font-size: 12px;
          line-height: 1.4;
        }
        .header { text-align: center; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 4px; }
        .info { border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 12px 0; margin-bottom: 12px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .items { margin-bottom: 12px; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .item-name { flex: 1; }
        .item-qty, .item-price, .item-total { text-align: right; }
        .item-price { color: #666; font-size: 11px; }
        .totals { border-top: 1px dashed #ccc; padding-top: 12px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .total-final { font-size: 16px; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 11px; }
        .print-btn { 
          position: fixed; 
          top: 20px; 
          right: 20px;
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        @media print {
          .print-btn { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Cetak</button>
      
      <div class="header">
        <h1>${receiptData.branchName}</h1>
        <p>${receiptData.branchPhone}</p>
      </div>
      
      <div class="info">
        <div class="info-row">
          <span>No. Order</span>
          <span>${receiptData.orderNumber}</span>
        </div>
        <div class="info-row">
          <span>Tanggal</span>
          <span>${new Date(receiptData.createdAt).toLocaleDateString("id-ID")}</span>
        </div>
        <div class="info-row">
          <span>Pelanggan</span>
          <span>${receiptData.customerName}</span>
        </div>
      </div>
      
      <div class="items">
        ${receiptData.items.map(item => `
          <div class="item-row">
            <div class="item-name">${item.serviceName}<br><span class="item-price">${formatCurrency(item.pricePerUnit)}/${item.unit}</span></div>
            <div class="item-qty">${item.quantity}</div>
            <div class="item-total">${formatCurrency(item.subtotal)}</div>
          </div>
        `).join("")}
      </div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatCurrency(receiptData.subtotal)}</span>
        </div>
        ${receiptData.discount > 0 ? `
        <div class="total-row" style="color: green;">
          <span>Diskon</span>
          <span>-${formatCurrency(receiptData.discount)}</span>
        </div>
        ` : ""}
        <div class="total-row total-final">
          <span>TOTAL</span>
          <span>${formatCurrency(receiptData.total)}</span>
        </div>
        <div class="total-row">
          <span>Pembayaran</span>
          <span style="text-transform: capitalize;">${receiptData.paymentMethod}</span>
        </div>
        ${receiptData.paymentMethod !== "cash" ? `
        <div class="total-row">
          <span>Status</span>
          <span style="color: orange;">Menunggu Pembayaran</span>
        </div>
        ` : ""}
      </div>
      
      <div class="footer">
        <p>Estimasi Selesai:</p>
        <p style="font-weight: bold;">
          ${new Date(receiptData.estimatedCompletionAt).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          })}
        </p>
        <p style="margin-top: 16px;">Terima kasih telah menggunakan</p>
        <p style="font-weight: bold;">VibeClean Laundry</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}
