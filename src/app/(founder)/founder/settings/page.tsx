"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, LogOut, Save, Percent, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransactionFeeSettings {
  feeType: "fixed" | "percentage";
  feeValue: number;
  feeMin: number;
  feeMax: number;
  enabled: boolean;
}

export default function FounderSettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Transaction fee settings
  const [transactionFee, setTransactionFee] = useState<TransactionFeeSettings>({
    feeType: "percentage",
    feeValue: 0.5,
    feeMin: 500,
    feeMax: 1000,
    enabled: true,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/founder/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.transactionFee) {
          setTransactionFee(data.transactionFee);
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSavePlatformSettings = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/founder/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionFee }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Gagal menyimpan pengaturan");
        return;
      }
      setSuccess("Pengaturan berhasil disimpan");
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/founder/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal mengubah password");
        return;
      }

      setSuccess(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/founder/login");
      }, 2000);
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/founder/logout", { method: "POST" });
      router.push("/founder/login");
    } catch {
      console.error("Logout error");
    }
  };

  const calculatePreview = (amount: number): number => {
    if (!transactionFee.enabled) return 0;
    let fee = transactionFee.feeType === "percentage" 
      ? (amount * transactionFee.feeValue) / 100 
      : transactionFee.feeValue;
    if (fee < transactionFee.feeMin) fee = transactionFee.feeMin;
    if (fee > transactionFee.feeMax) fee = transactionFee.feeMax;
    return Math.round(fee);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Pengaturan Founder</h1>
          <p className="text-muted-foreground">Kelola akun dan platform VibeClean</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <Tabs defaultValue="platform" className="space-y-4">
          <TabsList>
            <TabsTrigger value="platform">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="w-4 h-4 mr-2" />
              Keamanan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform">
            {/* Transaction Fee Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  Biaya Transaksi (Transaction Fee)
                </CardTitle>
                <CardDescription>
                  Atur biaya transaksi yang dikenakan pada setiap pembayaran. 
                  Biaya ini akan dipotong dari jumlah yang diterima owner.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aktifkan Biaya Transaksi</Label>
                    <p className="text-sm text-muted-foreground">
                      Jika dinonaktifkan, tidak ada biaya transaksi yang dikenakan
                    </p>
                  </div>
                  <Switch
                    checked={transactionFee.enabled}
                    onCheckedChange={(checked) => 
                      setTransactionFee({ ...transactionFee, enabled: checked })
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="feeType">Tipe Biaya</Label>
                    <select
                      id="feeType"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={transactionFee.feeType}
                      onChange={(e) => 
                        setTransactionFee({ 
                          ...transactionFee, 
                          feeType: e.target.value as "fixed" | "percentage" 
                        })
                      }
                    >
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Fixed (Nominal)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feeValue">
                      {transactionFee.feeType === "percentage" ? "Persentase (%)" : "Nominal (Rp)"}
                    </Label>
                    <Input
                      id="feeValue"
                      type="number"
                      step={transactionFee.feeType === "percentage" ? "0.1" : "100"}
                      min="0"
                      value={transactionFee.feeValue}
                      onChange={(e) => 
                        setTransactionFee({ 
                          ...transactionFee, 
                          feeValue: parseFloat(e.target.value) || 0 
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feeMin">Minimum Biaya (Rp)</Label>
                    <Input
                      id="feeMin"
                      type="number"
                      min="0"
                      step="100"
                      value={transactionFee.feeMin}
                      onChange={(e) => 
                        setTransactionFee({ 
                          ...transactionFee, 
                          feeMin: parseInt(e.target.value) || 0 
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feeMax">Maximum Biaya (Rp)</Label>
                    <Input
                      id="feeMax"
                      type="number"
                      min="0"
                      step="100"
                      value={transactionFee.feeMax}
                      onChange={(e) => 
                        setTransactionFee({ 
                          ...transactionFee, 
                          feeMax: parseInt(e.target.value) || 0 
                        })
                      }
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Preview:</h4>
                  <div className="text-sm space-y-1">
                    <p>Transaksi Rp 50.000 → Biaya: Rp {calculatePreview(50000).toLocaleString("id-ID")}</p>
                    <p>Transaksi Rp 100.000 → Biaya: Rp {calculatePreview(100000).toLocaleString("id-ID")}</p>
                    <p>Transaksi Rp 200.000 → Biaya: Rp {calculatePreview(200000).toLocaleString("id-ID")}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={handleSavePlatformSettings} 
                    disabled={isLoading || isLoadingSettings}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Pengaturan
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Ubah Password
                </CardTitle>
                <CardDescription>
                  Password akan disimpan di environment variable. Untuk keamanan, 
                  setelah mengubah password di sini, Anda perlu mengupdate manually di Heroku.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Lama</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Masukkan password lama"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Masukkan password baru"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi password baru"
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Logout */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Keluar
                </CardTitle>
                <CardDescription>
                  Logout dari akun founder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
