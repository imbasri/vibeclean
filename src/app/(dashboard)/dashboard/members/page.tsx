"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  DollarSign,
  Percent,
  Package,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  FormInputField,
  FormTextareaField,
  FormRow,
  LoadingButtonContent,
} from "@/components/common";
import { useMemberPackages, type MemberPackage } from "@/hooks/use-member-packages";
import { formatCurrency } from "@/lib/utils";

const fadeIn: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function MemberPackagesPage() {
  const router = useRouter();
  const { packages, isLoading, error, createPackage, updatePackage, deletePackage, refetch } = useMemberPackages();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MemberPackage | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    maxWeightKg: "" as string | number,
    freePickupDelivery: false,
    maxTransactionsPerMonth: "" as string | number,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      discountType: "percentage",
      discountValue: 0,
      maxWeightKg: "",
      freePickupDelivery: false,
      maxTransactionsPerMonth: "",
      isActive: true,
    });
    setEditingPackage(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (pkg: MemberPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      discountType: pkg.discountType,
      discountValue: pkg.discountValue,
      maxWeightKg: pkg.maxWeightKg || "",
      freePickupDelivery: pkg.freePickupDelivery,
      maxTransactionsPerMonth: pkg.maxTransactionsPerMonth || "",
      isActive: pkg.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        price: Number(formData.price),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxWeightKg: formData.maxWeightKg ? Number(formData.maxWeightKg) : null,
        freePickupDelivery: formData.freePickupDelivery,
        maxTransactionsPerMonth: formData.maxTransactionsPerMonth ? Number(formData.maxTransactionsPerMonth) : null,
        isActive: formData.isActive,
      };

      if (editingPackage) {
        await updatePackage(editingPackage.id, data);
        toast.success("Paket berhasil diperbarui");
      } else {
        await createPackage(data);
        toast.success("Paket berhasil dibuat");
      }

      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error("Gagal menyimpan paket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    const success = await deletePackage(deleteConfirmId);
    if (success) {
      toast.success("Paket berhasil dihapus");
    } else {
      toast.error("Gagal menghapus paket");
    }
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paket Member</h1>
          <p className="text-muted-foreground">
            Kelola paket langganan untuk pelanggan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/members/subscriptions")}>
            <Users className="h-4 w-4 mr-2" />
            Subscriptions
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Paket
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeIn}
            >
              <Card className={!pkg.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {pkg.name}
                    </CardTitle>
                    <Badge variant={pkg.isActive ? "default" : "secondary"}>
                      {pkg.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {pkg.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Harga</span>
                    <span className="font-semibold">{formatCurrency(pkg.price)}/bln</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="font-medium">
                      {pkg.discountType === "percentage" ? (
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {pkg.discountValue}%
                        </span>
                      ) : (
                        formatCurrency(pkg.discountValue)
                      )}
                    </span>
                  </div>

                  {pkg.maxWeightKg && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max Berat</span>
                      <span>{pkg.maxWeightKg} kg</span>
                    </div>
                  )}

                  {pkg.maxTransactionsPerMonth && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max Transaksi</span>
                      <span>{pkg.maxTransactionsPerMonth}x / bulan</span>
                    </div>
                  )}

                  {pkg.freePickupDelivery && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Gratis</span>
                      <Badge variant="outline">Pickup & Delivery</Badge>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(pkg)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmId(pkg.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {packages.length === 0 && !isLoading && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada paket member</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Paket Pertama
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Paket Member" : "Tambah Paket Member"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage 
                ? "Perbarui informasi paket member"
                : "Buat paket langganan baru untuk pelanggan"
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInputField
              label="Nama Paket"
              name="name"
              placeholder="contoh: Cuci Regular Member"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <FormTextareaField
              label="Deskripsi"
              name="description"
              placeholder="Deskripsi paket (opsional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <FormInputField
              label="Harga per Bulan (Rp)"
              name="price"
              type="number"
              placeholder="50000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              required
            />

            <FormRow>
              <div className="space-y-2">
                <Label>Jenis Diskon</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                >
                  <option value="percentage">Persen (%)</option>
                  <option value="fixed">Fixed Amount (Rp)</option>
                </select>
              </div>

              <FormInputField
                label="Nilai Diskon"
                name="discountValue"
                type="number"
                placeholder={formData.discountType === "percentage" ? "10" : "2000"}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
              />
            </FormRow>

            <FormRow>
              <FormInputField
                label="Max Berat (kg)"
                name="maxWeightKg"
                type="number"
                placeholder="Tidak terbatas"
                value={formData.maxWeightKg}
                onChange={(e) => setFormData({ ...formData, maxWeightKg: e.target.value })}
              />

              <FormInputField
                label="Max Transaksi/Bulan"
                name="maxTransactionsPerMonth"
                type="number"
                placeholder="Tidak terbatas"
                value={formData.maxTransactionsPerMonth}
                onChange={(e) => setFormData({ ...formData, maxTransactionsPerMonth: e.target.value })}
              />
            </FormRow>

            <div className="flex items-center justify-between">
              <Label>Gratis Pickup & Delivery</Label>
              <Switch
                checked={formData.freePickupDelivery}
                onCheckedChange={(checked) => setFormData({ ...formData, freePickupDelivery: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Menyimpan...
                  </span>
                ) : editingPackage ? (
                  "Simpan Perubahan"
                ) : (
                  "Buat Paket"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Paket</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus paket ini? Pelanggan yang sudah berlangganan akan tetap mempertahankan akses hingga masa berlaku habis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
