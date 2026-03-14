"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Building2, 
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { PermissionGuard } from "@/components/common/permission-guard";
import { useBalance, requestWithdrawal } from "@/hooks/use-balance";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

const bankOptions = [
  { value: "bca", label: "Bank BCA" },
  { value: "mandiri", label: "Bank Mandiri" },
  { value: "bni", label: "Bank BNI" },
  { value: "bri", label: "Bank BRI" },
  { value: "bjb", label: "Bank BJB" },
  { value: "bsi", label: "Bank BSI" },
  { value: "cimb", label: "Bank CIMB Niaga" },
  { value: "danamon", label: "Bank Danamon" },
  { value: "other", label: "Bank Lainnya" },
];

export default function BalancePage() {
  const { balance, transactions, isLoading, error, refetch } = useBalance();
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      gooeyToast.error("Validasi Gagal", { description: "Masukkan jumlah penarikan" });
      return;
    }

    if (!bankName || !bankAccountNumber || !bankAccountName) {
      gooeyToast.error("Validasi Gagal", { description: "Lengkapi data rekening" });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (balance && amount > balance.availableBalance) {
      gooeyToast.error("Saldo Tidak Cukup", { 
        description: `Saldo tersedia: ${formatCurrency(balance.availableBalance)}` 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestWithdrawal({
        amount,
        bankName,
        bankAccountNumber,
        bankAccountName,
      });

      if (result.success) {
        gooeyToast.success("Penarikan Berhasil", { description: result.message });
        setIsWithdrawDialogOpen(false);
        setWithdrawAmount("");
        setBankName("");
        setBankAccountNumber("");
        setBankAccountName("");
        refetch();
      } else {
        gooeyToast.error("Gagal", { description: result.error });
      }
    } catch (err) {
      gooeyToast.error("Error", { description: "Terjadi kesalahan" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetMaxAmount = () => {
    if (balance) {
      setWithdrawAmount(String(balance.availableBalance));
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_received: "Penerimaan Pembayaran",
      fee_deducted: "Potongan Biaya",
      withdrawal: "Penarikan",
      refund: "Refund",
      adjustment: "Penyesuaian",
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      payment_received: "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
      fee_deducted: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
      withdrawal: "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
      refund: "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30",
      adjustment: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Gagal Memuat Data Saldo</h2>
        <p className="text-gray-500 mb-4 max-w-md">{error}</p>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline">Coba Lagi</Button>
          <Button onClick={() => window.location.href = '/dashboard'} variant="default">
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard allowedRoles={["owner", "manager"]} fallback={
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Wallet className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold">Akses Terbatas</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Hanya owner dan manager yang dapat mengakses halaman saldo.
        </p>
      </div>
    }>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <h1 className="text-2xl font-bold">Saldo & Penarikan</h1>
          <p className="text-gray-500 mt-1">Kelola saldo dan tarik dana ke rekening bank</p>
        </motion.div>

        {/* Balance Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
          className="grid gap-4 md:grid-cols-3"
        >
          {/* Available Balance */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-100">Saldo Tersedia</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {formatCurrency(balance?.availableBalance || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsWithdrawDialogOpen(true)}
                className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
                disabled={(balance?.availableBalance || 0) <= 0}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Tarik Dana
              </Button>
            </CardContent>
          </Card>

          {/* Total Earnings */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pendapatan</CardDescription>
              <CardTitle className="text-2xl font-bold text-green-600">
                {formatCurrency(balance?.totalEarnings || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-green-500" />
                <span>Semua penerimaan</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Withdrawn */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Ditarik</CardDescription>
              <CardTitle className="text-2xl font-bold text-orange-600">
                {formatCurrency(balance?.totalWithdrawn || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-orange-500" />
                <span>Riwayat penarikan</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Riwayat Transaksi
              </CardTitle>
              <CardDescription>20 transaksi terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada transaksi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getTransactionTypeColor(tx.type)}`}>
                          {tx.type === "payment_received" ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : tx.type === "withdrawal" ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <Wallet className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getTransactionTypeLabel(tx.type)}</p>
                          <p className="text-xs text-gray-500">{tx.description}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          tx.type === "payment_received" ? "text-green-600" : 
                          tx.type === "withdrawal" ? "text-orange-600" : "text-gray-600"
                        }`}>
                          {tx.type === "payment_received" ? "+" : "-"}
                          {formatCurrency(tx.netAmount)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Withdraw Dialog */}
        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
                Tarik Dana
              </DialogTitle>
              <DialogDescription>
                Saldo tersedia: {formatCurrency(balance?.availableBalance || 0)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Penarikan</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleSetMaxAmount}>
                    Max
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank</Label>
                <select
                  id="bankName"
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="">Pilih Bank</option>
                  {bankOptions.map((bank) => (
                    <option key={bank.value} value={bank.label}>
                      {bank.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Nomor Rekening</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  placeholder="xxxx-xxxx-xxxx"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Nama Pemilik Rekening</Label>
                <Input
                  id="accountName"
                  type="text"
                  placeholder="Nama sesuai di rekening"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>
                Batal
              </Button>
              <Button 
                onClick={handleWithdraw} 
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Konfirmasi Penarikan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
