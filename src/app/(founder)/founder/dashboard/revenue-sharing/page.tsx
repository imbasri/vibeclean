"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  DollarSign, 
  Percent,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowUpDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface RevenueSharingSetting {
  id: string;
  organizationId: string;
  customFeeType: string | null;
  customFeeValue: string | null;
  customFeeMin: number | null;
  customFeeMax: number | null;
  founderDiscountPercent: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  orgName: string | null;
  orgSlug: string | null;
  orgPlan: string | null;
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-800",
  pro: "bg-blue-100 text-blue-800",
  enterprise: "bg-purple-100 text-purple-800",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RevenueSharingPage() {
  const [settings, setSettings] = useState<RevenueSharingSetting[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<RevenueSharingSetting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [customFeeType, setCustomFeeType] = useState<string>("percentage");
  const [customFeeValue, setCustomFeeValue] = useState<string>("0.5");
  const [customFeeMin, setCustomFeeMin] = useState<string>("500");
  const [customFeeMax, setCustomFeeMax] = useState<string>("1000");
  const [founderDiscount, setFounderDiscount] = useState<string>("0");
  const [reason, setReason] = useState<string>("");

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/founder/revenue-sharing");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/organizations?limit=100");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchOrganizations()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchSettings, fetchOrganizations]);

  const filteredSettings = settings.filter(
    (s) =>
      s.orgName?.toLowerCase().includes(search.toLowerCase()) ||
      s.orgSlug?.toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (setting?: RevenueSharingSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setSelectedOrgId(setting.organizationId);
      setCustomFeeType(setting.customFeeType || "percentage");
      setCustomFeeValue(setting.customFeeValue || "0.5");
      setCustomFeeMin(setting.customFeeMin?.toString() || "500");
      setCustomFeeMax(setting.customFeeMax?.toString() || "1000");
      setFounderDiscount(setting.founderDiscountPercent || "0");
      setReason(setting.reason || "");
    } else {
      setEditingSetting(null);
      setSelectedOrgId("");
      setCustomFeeType("percentage");
      setCustomFeeValue("0.5");
      setCustomFeeMin("500");
      setCustomFeeMax("1000");
      setFounderDiscount("0");
      setReason("");
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedOrgId) return;
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/founder/revenue-sharing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          customFeeType,
          customFeeValue,
          customFeeMin: parseInt(customFeeMin),
          customFeeMax: parseInt(customFeeMax),
          founderDiscountPercent: founderDiscount,
          reason,
        }),
      });

      if (response.ok) {
        await fetchSettings();
        setShowDialog(false);
      }
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm("Yakin ingin menghapus pengaturan revenue sharing ini?")) return;
    
    try {
      const response = await fetch(`/api/founder/revenue-sharing?organizationId=${orgId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchSettings();
      }
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const availableOrgs = organizations.filter(
    (org) => !settings.find((s) => s.organizationId === org.id) || 
             editingSetting?.organizationId === org.id
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Sharing</h1>
          <p className="text-muted-foreground">
            Atur custom transaction fee untuk merchant tertentu
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengaturan
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Default Transaction Fee
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Default: 0.5% (min Rp 500, max Rp 1.000) per transaksi. 
                Gunakan pengaturan ini untuk memberikan potongan khusus kepada merchant besar/loyal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari organisasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Settings List */}
      <div className="grid gap-4">
        {filteredSettings.length === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Belum ada pengaturan revenue sharing
            </p>
            <Button className="mt-4" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pengaturan Pertama
            </Button>
          </Card>
        ) : (
          filteredSettings.map((setting) => (
            <Card key={setting.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>{setting.orgName || "Unknown"}</CardTitle>
                    <CardDescription>@{setting.orgSlug}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={PLAN_COLORS[setting.orgPlan || "starter"]}>
                    {setting.orgPlan}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Custom Fee</p>
                    <p className="font-medium">
                      {setting.customFeeType === "percentage" 
                        ? `${setting.customFeeValue}%`
                        : formatCurrency(Number(setting.customFeeValue))
                      }
                    </p>
                    {setting.customFeeMin && setting.customFeeMax && (
                      <p className="text-xs text-muted-foreground">
                        (min {formatCurrency(setting.customFeeMin)} - max {formatCurrency(setting.customFeeMax)})
                      </p>
                    )}
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Founder Discount</p>
                    <p className="font-medium">{setting.founderDiscountPercent}%</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 md:col-span-2">
                    <p className="text-xs text-muted-foreground">Alasan</p>
                    <p className="text-sm">{setting.reason || "-"}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <Button variant="outline" size="sm" onClick={() => openDialog(setting)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(setting.organizationId)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? "Edit Revenue Sharing" : "Tambah Revenue Sharing"}
            </DialogTitle>
            <DialogDescription>
              Atur custom transaction fee untuk organisasi tertentu
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!editingSetting && (
              <div className="space-y-2">
                <Label>Organisasi</Label>
                <Select 
                  value={selectedOrgId || ""}
                  onValueChange={(val) => {
                    if (val) setSelectedOrgId(val);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih organisasi" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {availableOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} (@{org.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Fee</Label>
                <Select 
                  value={customFeeType || ""} 
                  onValueChange={(val) => {
                    if (val) setCustomFeeType(val);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nilai Fee</Label>
                <Input
                  type="number"
                  step={customFeeType === "percentage" ? "0.1" : "100"}
                  value={customFeeValue}
                  onChange={(e) => setCustomFeeValue(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Fee (Rp)</Label>
                <Input
                  type="number"
                  value={customFeeMin}
                  onChange={(e) => setCustomFeeMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Fee (Rp)</Label>
                <Input
                  type="number"
                  value={customFeeMax}
                  onChange={(e) => setCustomFeeMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Founder Discount (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={founderDiscount}
                onChange={(e) => setFounderDiscount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Diskon dari fee untuk merchant (0% = tidak ada diskon)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Alasan / Catatan</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Merchant loyal dengan volume tinggi"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !selectedOrgId}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
