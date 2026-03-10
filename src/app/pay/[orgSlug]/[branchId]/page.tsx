"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, QrCode, CheckCircle, Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BranchData {
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  paymentUrl: string;
}

interface PaymentData {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  expiredAt?: string;
}

export default function BranchPaymentPage({
  params,
}: {
  params: Promise<{ orgSlug: string; branchId: string }>;
}) {
  const searchParams = useSearchParams();
  const [branchData, setBranchData] = useState<BranchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBranchData() {
      try {
        const { branchId } = await params;
        const response = await fetch(`/api/branches/${branchId}/qrcode`);
        const data = await response.json();
        
        if (data.branch) {
          setBranchData(data);
        }
      } catch (err) {
        setError("Failed to load branch data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBranchData();
  }, [params]);

  const handleCreatePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Masukkan jumlah yang valid");
      return;
    }

    setIsCreatingPayment(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branchData?.branch.id,
          amount: parseFloat(amount),
          customerName: customerName || "Pelanggan",
          customerPhone: customerPhone || "08000000000",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentData(data);
      } else {
        setError(data.error || "Failed to create payment");
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!branchData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cabang Tidak Ditemukan</h1>
          <Link href="/pay" className="text-blue-600 hover:underline">
            Kembali ke daftar cabang
          </Link>
        </div>
      </div>
    );
  }

  // Show payment success with QR code
  if (paymentData?.success && paymentData.qrCodeUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Silakan Lakukan Pembayaran
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Scan QR Code di bawah menggunakan aplikasi perbankan atau e-wallet
              </p>
            </div>

            {/* QR Code */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg border mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentData.qrCodeUrl}
                      alt="QRIS Payment"
                      className="w-64 h-64"
                    />
                  </div>
                  <Badge variant="outline" className="text-sm">
                    QRIS
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Payment Link Alternative */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Cara Lain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href={paymentData.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button variant="outline" className="w-full">
                    Buka Halaman Pembayaran
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Branch Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{branchData.branch.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>{branchData.branch.address}</p>
                <p>{branchData.branch.phone}</p>
              </CardContent>
            </Card>

            {/* Back Button */}
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => setPaymentData(null)}>
                Buat Pembayaran Baru
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show payment form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pembayaran {branchData.branch.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {branchData.organization.name}
            </p>
          </div>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Masukkan Jumlah Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Nama (Opsional)</Label>
                <Input
                  id="customerName"
                  type="text"
                  placeholder="Nama lengkap"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">No. HP (Opsional)</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="08xxxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreatePayment}
                disabled={isCreatingPayment || !amount}
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Buat Pembayaran"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Branch Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Outlet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <QrCode className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{branchData.branch.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p>{branchData.branch.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              href="/pay"
              className="text-blue-600 hover:underline text-sm"
            >
              Pilih cabang lain
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
