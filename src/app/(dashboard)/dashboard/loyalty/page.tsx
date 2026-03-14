"use client";

import { useState, useEffect, useCallback } from "react";
import { useLoyaltyStore } from "@/stores";
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Save,
  Star,
  TrendingUp,
  Users,
  Ticket,
  Calendar,
  Percent,
  DollarSign,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gooeyToast } from "goey-toast";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  scope: "all" | "category" | "service";
  category: string | null;
  serviceId: string | null;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
}

interface MembershipTier {
  id: string;
  name: string;
  tier: string;
  minSpending: string;
  discountPercentage: string;
  pointMultiplier: string;
  isActive: boolean;
}

const DEFAULT_TIERS = [
  { name: "Bronze", tier: "bronze", minSpending: "0", discountPercentage: "0", pointMultiplier: "1", isActive: true },
  { name: "Silver", tier: "silver", minSpending: "500000", discountPercentage: "5", pointMultiplier: "1.5", isActive: true },
  { name: "Gold", tier: "gold", minSpending: "1000000", discountPercentage: "10", pointMultiplier: "2", isActive: true },
  { name: "VIP", tier: "platinum", minSpending: "2000000", discountPercentage: "15", pointMultiplier: "3", isActive: true },
];

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  silver: "bg-gray-100 dark:bg-gray-800/30 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  gold: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  platinum: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
};

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(amount));
}

export default function LoyaltySettingsPage() {
  // Zustand store
  const loyaltyStore = useLoyaltyStore();
  const {
    activeTab,
    setActiveTab,
    tiers,
    setTiers,
    isLoadingTiers,
    setIsLoadingTiers,
    showTierDialog,
    setShowTierDialog,
    editingTier,
    setEditingTier,
    tierFormData,
    setTierFormData,
    resetTierFormData,
    coupons,
    setCoupons,
    isLoadingCoupons,
    setIsLoadingCoupons,
    showCouponDialog,
    setShowCouponDialog,
    editingCoupon,
    setEditingCoupon,
    couponFormData,
    setCouponFormData,
    resetCouponFormData,
  } = loyaltyStore;

  // Local state (non-shared)
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    minSpending: string;
    discountPercentage: string;
    pointMultiplier: string;
    isActive: boolean;
  }>({
    name: '',
    tier: 'bronze',
    minSpending: '0',
    discountPercentage: '0',
    pointMultiplier: '1',
    isActive: true,
  });

  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch("/api/loyalty/tiers");
      if (response.ok) {
        const data = await response.json();
        setTiers(data.tiers || []);
      }
    } catch (err) {
      console.error("Error fetching tiers:", err);
    } finally {
      setIsLoadingTiers(false);
    }
  }, [setTiers, setIsLoadingTiers]);

  const fetchCoupons = useCallback(async () => {
    try {
      const response = await fetch("/api/coupons");
      if (response.ok) {
        const data = await response.json();
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error("Error fetching coupons:", err);
    } finally {
      setIsLoadingCoupons(false);
    }
  }, [setCoupons, setIsLoadingCoupons]);

  useEffect(() => { 
    fetchTiers(); 
    fetchCoupons();
  }, [fetchTiers, fetchCoupons]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openDialog = (tier?: MembershipTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({ 
        name: tier.name, 
        tier: tier.tier as 'bronze' | 'silver' | 'gold' | 'platinum', 
        minSpending: tier.minSpending, 
        discountPercentage: tier.discountPercentage, 
        pointMultiplier: tier.pointMultiplier, 
        isActive: tier.isActive 
      });
    } else {
      setEditingTier(null);
      setFormData({ name: "", tier: "bronze", minSpending: "0", discountPercentage: "0", pointMultiplier: "1", isActive: true });
    }
    setShowTierDialog(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = editingTier ? "PUT" : "POST";
      const body = editingTier ? { ...formData, id: editingTier.id } : formData;
      const response = await fetch("/api/loyalty/tiers", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (response.ok) { await fetchTiers(); setShowTierDialog(false); }
    } catch (err) { console.error("Error saving tier:", err); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tier ini?")) return;
    try {
      const response = await fetch(`/api/loyalty/tiers?id=${id}`, { method: "DELETE" });
      if (response.ok) await fetchTiers();
    } catch (err) { console.error("Error deleting tier:", err); }
  };

  const handleResetToDefault = async () => {
    setIsSaving(true);
    try {
      for (const tier of tiers) {
        await fetch(`/api/loyalty/tiers?id=${tier.id}`, { method: "DELETE" });
      }
      for (const tier of DEFAULT_TIERS) {
        await fetch("/api/loyalty/tiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tier) });
      }
      await fetchTiers();
      setShowResetConfirm(false);
    } catch (err) { console.error("Error resetting tiers:", err); }
    finally { setIsSaving(false); }
  };

  // Coupon handlers
  const openCouponDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponFormData({
        code: coupon.code,
        description: coupon.description || "",
        type: coupon.type,
        value: coupon.value,
        scope: coupon.scope,
        category: coupon.category || "",
        serviceId: coupon.serviceId || "",
        minOrderAmount: coupon.minOrderAmount || 0,
        maxDiscount: coupon.maxDiscount || 0,
        usageLimit: coupon.usageLimit,
        perUserLimit: coupon.perUserLimit,
        validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split("T")[0] : "",
        validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split("T")[0] : "",
        isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      setCouponFormData({
        code: "",
        description: "",
        type: "percentage",
        value: 0,
        scope: "all",
        category: "",
        serviceId: "",
        minOrderAmount: 0,
        maxDiscount: 0,
        usageLimit: null,
        perUserLimit: null,
        validFrom: "",
        validUntil: "",
        isActive: true,
      });
    }
    setShowCouponDialog(true);
  };

  const handleSaveCoupon = async () => {
    setIsSaving(true);
    try {
      // Validate required fields
      if (!couponFormData.code || couponFormData.code.length < 3) {
        gooeyToast.error("Kode kupon minimal 3 karakter");
        setIsSaving(false);
        return;
      }
      if (!couponFormData.value || couponFormData.value <= 0) {
        gooeyToast.error("Nilai diskon harus lebih dari 0");
        setIsSaving(false);
        return;
      }
      if (couponFormData.scope === "service" && !couponFormData.serviceId) {
        gooeyToast.error("Pilih layanan untuk kupon ini");
        setIsSaving(false);
        return;
      }

      // Build payload with proper null handling
      const serviceIdValue = couponFormData.scope === "service" && couponFormData.serviceId 
        ? couponFormData.serviceId 
        : null;
      
      const payload = {
        code: couponFormData.code.toUpperCase(),
        description: couponFormData.description || undefined,
        type: couponFormData.type,
        value: Number(couponFormData.value),
        scope: couponFormData.scope,
        category: couponFormData.scope === "category" && couponFormData.category ? couponFormData.category : undefined,
        serviceId: serviceIdValue,
        minOrderAmount: couponFormData.minOrderAmount && couponFormData.minOrderAmount > 0 ? Number(couponFormData.minOrderAmount) : undefined,
        maxDiscount: couponFormData.maxDiscount && couponFormData.maxDiscount > 0 ? Number(couponFormData.maxDiscount) : undefined,
        usageLimit: couponFormData.usageLimit ? Number(couponFormData.usageLimit) : undefined,
        perUserLimit: couponFormData.perUserLimit ? Number(couponFormData.perUserLimit) : undefined,
        validFrom: couponFormData.validFrom || undefined,
        validUntil: couponFormData.validUntil || undefined,
        isActive: couponFormData.isActive,
      };
      
      const method = editingCoupon ? "PUT" : "POST";
      const url = editingCoupon ? `/api/coupons?id=${editingCoupon.id}` : "/api/coupons";
      
      console.log("Saving coupon:", payload);
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("Coupon response:", result);

      if (response.ok) {
        await fetchCoupons();
        setShowCouponDialog(false);
        gooeyToast.success(editingCoupon ? "Kupon diperbarui!" : "Kupon dibuat!");
      } else {
        gooeyToast.error(result.error || "Gagal menyimpan kupon");
      }
    } catch (err) {
      console.error("Error saving coupon:", err);
      gooeyToast.error("Gagal menyimpan kupon");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kupon ini?")) return;
    try {
      const response = await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchCoupons();
        gooeyToast.success("Kupon dihapus!");
      }
    } catch (err) {
      console.error("Error deleting coupon:", err);
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    try {
      const response = await fetch(`/api/coupons?id=${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      if (response.ok) {
        await fetchCoupons();
        gooeyToast.success(!coupon.isActive ? "Kupon diaktifkan!" : "Kupon dinonaktifkan!");
      }
    } catch (err) {
      console.error("Error toggling coupon:", err);
    }
  };

  if (isLoadingTiers || isLoadingCoupons) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
        <TabsList className="mb-4">
          <TabsTrigger value="tiers" className="gap-2">
            <Star className="w-4 h-4" />
            Tier Member
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2">
            <Ticket className="w-4 h-4" />
            Kupon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tier Membership</h2>
              <p className="text-sm text-muted-foreground">Atur level membership pelanggan</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowResetConfirm(true)}>Reset ke Default</Button>
              <Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Tambah Tier</Button>
            </div>
          </div>

          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Cara Kerja Loyalty Program</p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                    <li>• Pelanggan earn poin setiap transaksi (1 poin per Rp 1.000)</li>
                    <li>• Poin dapat ditukar dengan diskon</li>
                    <li>• Tier otomatis naik berdasarkan total spending</li>
                    <li>• Tier lebih tinggi = diskon lebih besar & bonus poin</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tier Aktif</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{tiers.filter((t) => t.isActive).length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tier</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{tiers.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tier Tertinggi</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tiers.length > 0 ? tiers.reduce((max, t) => Number(t.minSpending) > Number(max.minSpending) ? t : max).name : "-"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tiers.length === 0 ? (
              <Card className="col-span-full p-12 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Belum ada tier membership. Klik "Tambah Tier" untuk memulai.</p>
              </Card>
            ) : (
              tiers.map((tier) => (
                <Card key={tier.id} className={!tier.isActive ? "opacity-60" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${TIER_COLORS[tier.tier]}`}>{tier.name}</div>
                      {!tier.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(tier)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tier.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Min. Spending</p><p className="font-medium">{formatCurrency(tier.minSpending)}</p></div>
                      <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Diskon</p><p className="font-medium">{tier.discountPercentage}%</p></div>
                      <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Point Multiplier</p><p className="font-medium">{tier.pointMultiplier}x</p></div>
                      <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Tier Key</p><p className="font-medium text-sm">{tier.tier}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kupon Diskon</h2>
              <p className="text-sm text-muted-foreground">Kelola kupon dan kode diskon</p>
            </div>
            <Button onClick={() => openCouponDialog()}><Plus className="h-4 w-4 mr-2" />Tambah Kupon</Button>
          </div>

          {coupons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada kupon. Klik tombol di atas untuk membuat kupon.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coupons.map((coupon) => (
                <Card key={coupon.id} className={coupon.isActive ? "" : "opacity-60"}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-mono">{coupon.code}</CardTitle>
                      <Badge variant={coupon.isActive ? "default" : "secondary"}>
                        {coupon.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    {coupon.description && <CardDescription>{coupon.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipe</span>
                        <span className="font-medium flex items-center gap-1">
                          {coupon.type === "percentage" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {coupon.type === "percentage" ? `${coupon.value}%` : formatCurrency(coupon.value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min. Order</span>
                        <span className="font-medium">{coupon.minOrderAmount ? formatCurrency(coupon.minOrderAmount) : "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max. Diskon</span>
                        <span className="font-medium">{coupon.maxDiscount ? formatCurrency(coupon.maxDiscount) : "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage</span>
                        <span className="font-medium">{coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / ∞"}</span>
                      </div>
                      {coupon.validUntil && isClient && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Berlaku hingga</span>
                          <span className="font-medium">{new Date(coupon.validUntil).toLocaleDateString("id-ID")}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openCouponDialog(coupon)}>
                        <Edit2 className="w-3 h-3 mr-1" />Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleCouponStatus(coupon)}>
                        {coupon.isActive ? "Nonaktif" : "Aktif"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? "Edit Tier" : "Tambah Tier"}</DialogTitle>
            <DialogDescription>Atur konfigurasi tier membership</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Tier</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Gold" />
              </div>
              <div className="space-y-2">
                <Label>Tier Key</Label>
                <Select value={formData.tier} onValueChange={(val) => { if (val) setFormData({ ...formData, tier: val }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Minimum Spending (Rp)</Label>
              <Input type="number" value={formData.minSpending} onChange={(e) => setFormData({ ...formData, minSpending: e.target.value })} />
              <p className="text-xs text-muted-foreground">Total spending minimum untuk mencapai tier ini</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diskon (%)</Label>
                <Input type="number" value={formData.discountPercentage} onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Point Multiplier</Label>
                <Input type="number" step="0.1" value={formData.pointMultiplier} onChange={(e) => setFormData({ ...formData, pointMultiplier: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset ke Default</DialogTitle>
            <DialogDescription>Ini akan menghapus semua tier yang ada dan menggantinya dengan default (Bronze, Silver, Gold, VIP).</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleResetToDefault} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mereset...</> : "Reset Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Kupon" : "Tambah Kupon"}</DialogTitle>
            <DialogDescription>Buat atau edit kode kupon diskon</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kode Kupon</Label>
              <Input 
                value={couponFormData.code} 
                onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })} 
                placeholder="CONTOH10"
                disabled={!!editingCoupon}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (Opsional)</Label>
              <Input 
                value={couponFormData.description} 
                onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })} 
                placeholder="Diskon special untuk pelanggan tetap"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Diskon</Label>
                <Select 
                  value={couponFormData.type} 
                  onValueChange={(val) => setCouponFormData({ ...couponFormData, type: val as "percentage" | "fixed" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persen (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nilai Diskon</Label>
                <Input 
                  type="number"
                  value={couponFormData.value} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, value: Number(e.target.value) })} 
                  placeholder={couponFormData.type === "percentage" ? "10" : "10000"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min. Order (Rp)</Label>
                <Input 
                  type="number"
                  value={couponFormData.minOrderAmount || ""} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: e.target.value ? Number(e.target.value) : 0 })} 
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max. Diskon (Rp)</Label>
                <Input 
                  type="number"
                  value={couponFormData.maxDiscount || ""} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, maxDiscount: e.target.value ? Number(e.target.value) : 0 })} 
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limit Penggunaan</Label>
                <Input 
                  type="number"
                  value={couponFormData.usageLimit || ""} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, usageLimit: e.target.value ? Number(e.target.value) : null })} 
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Per User Limit</Label>
                <Input 
                  type="number"
                  value={couponFormData.perUserLimit || ""} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, perUserLimit: e.target.value ? Number(e.target.value) : null })} 
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Berlaku Dari</Label>
                <Input 
                  type="date"
                  value={couponFormData.validFrom} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, validFrom: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Berlaku Sampai</Label>
                <Input 
                  type="date"
                  value={couponFormData.validUntil} 
                  onChange={(e) => setCouponFormData({ ...couponFormData, validUntil: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select 
                value={couponFormData.scope} 
                onValueChange={(val) => setCouponFormData({ ...couponFormData, scope: val as "all" | "category" | "service" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan</SelectItem>
                  <SelectItem value="category">Kategori Tertentu</SelectItem>
                  <SelectItem value="service">Layanan Tertentu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch 
                checked={couponFormData.isActive} 
                onCheckedChange={(checked) => setCouponFormData({ ...couponFormData, isActive: checked })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCouponDialog(false)}>Batal</Button>
            <Button onClick={handleSaveCoupon} disabled={isSaving || !couponFormData.code || !couponFormData.value}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
