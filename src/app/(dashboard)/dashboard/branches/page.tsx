"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion";
import {
  Plus,
  Search,
  Edit2,
  MoreHorizontal,
  Building2,
  MapPin,
  Phone,
  Users,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Calendar,
  ShoppingBag,
  DollarSign,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
  QrCode,
  Download,
  Printer,
  Copy,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PermissionGuard } from "@/components/common/permission-guard";
import { useBranches } from "@/hooks/use-branches";
import { formatCurrency, formatDate } from "@/lib/utils";

// Animation config
const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      ease: easeOut,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: easeOut }
  },
};

type BranchFormData = {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
};

const initialFormData: BranchFormData = {
  name: "",
  address: "",
  phone: "",
  isActive: true,
};

export default function BranchesPage() {
  // Use the branches hook with stats
  const {
    branches,
    isLoading,
    error,
    refetch,
    createBranch,
    updateBranch,
  } = useBranches({ includeStats: true });

  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedBranchName, setSelectedBranchName] = useState<string>("");
  const [formData, setFormData] = useState<BranchFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // QR Code state
  const [qrCodeData, setQRCodeData] = useState<{
    qrCode: string;
    paymentUrl: string;
  } | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Filter branches
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.isActive).length;
  const totalRevenue = branches.reduce((sum, b) => sum + (b.stats?.totalRevenue || 0), 0);
  const totalOrders = branches.reduce((sum, b) => sum + (b.stats?.totalOrders || 0), 0);

  // Handlers
  const handleAddBranch = async () => {
    if (!formData.name || !formData.address || !formData.phone) {
      gooeyToast.error("Validasi Gagal", { description: "Semua field harus diisi" });
      return;
    }

    setIsSubmitting(true);
    try {
      const newBranch = await createBranch({
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        isActive: formData.isActive,
      });

      if (newBranch) {
        setIsAddDialogOpen(false);
        setFormData(initialFormData);
        gooeyToast.success("Cabang Ditambahkan", { description: `${newBranch.name} berhasil ditambahkan` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menambahkan cabang";
      gooeyToast.error("Gagal", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBranch = async () => {
    if (!selectedBranchId || !formData.name || !formData.address || !formData.phone) {
      gooeyToast.error("Validasi Gagal", { description: "Semua field harus diisi" });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedBranch = await updateBranch(selectedBranchId, {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        isActive: formData.isActive,
      });

      if (updatedBranch) {
        setIsEditDialogOpen(false);
        setSelectedBranchId(null);
        setFormData(initialFormData);
        gooeyToast.success("Cabang Diperbarui", { description: `${updatedBranch.name} berhasil diperbarui` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui cabang";
      gooeyToast.error("Gagal", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (branchId: string, currentStatus: boolean, branchName: string) => {
    try {
      await updateBranch(branchId, { isActive: !currentStatus });
      gooeyToast.success(
        currentStatus ? "Cabang Dinonaktifkan" : "Cabang Diaktifkan",
        { description: `${branchName} ${currentStatus ? "dinonaktifkan" : "diaktifkan"}` }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengubah status cabang";
      gooeyToast.error("Gagal", { description: message });
    }
  };

  const openEditDialog = (branch: typeof branches[0]) => {
    setSelectedBranchId(branch.id);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openQRDialog = (branch: typeof branches[0]) => {
    setSelectedBranchId(branch.id);
    setSelectedBranchName(branch.name);
    setQRCodeData(null);
    setIsQRDialogOpen(true);
  };

  const generateQRCode = async (size: "small" | "medium" | "large" = "medium") => {
    if (!selectedBranchId) return;
    
    setIsGeneratingQR(true);
    try {
      const response = await fetch(`/api/branches/${selectedBranchId}/qrcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQRCodeData({
          qrCode: data.qrCode,
          paymentUrl: data.paymentUrl,
        });
      } else {
        gooeyToast.error("Gagal", { description: data.error || "Gagal generate QR" });
      }
    } catch (err) {
      gooeyToast.error("Gagal", { description: "Gagal generate QR code" });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const copyPaymentUrl = () => {
    if (qrCodeData?.paymentUrl) {
      navigator.clipboard.writeText(qrCodeData.paymentUrl);
      gooeyToast.success("Disalin", { description: "Link pembayaran disalin" });
    }
  };

  const downloadQR = () => {
    if (!qrCodeData?.qrCode) return;
    
    const link = document.createElement("a");
    link.href = qrCodeData.qrCode;
    link.download = `qr-code-${selectedBranchName.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500">Memuat data cabang...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Gagal Memuat Data</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <PermissionGuard allowedRoles={["owner"]} fallback={
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Building2 className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Akses Terbatas</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Hanya owner yang dapat mengakses manajemen cabang. 
          Hubungi owner untuk informasi lebih lanjut.
        </p>
      </div>
    }>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Cabang</h1>
            <p className="text-gray-500 mt-1">Kelola semua cabang laundry Anda</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Cabang
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalBranches}</p>
                    <p className="text-sm text-gray-500">Total Cabang</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeBranches}</p>
                    <p className="text-sm text-gray-500">Cabang Aktif</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                    <p className="text-sm text-gray-500">Total Pendapatan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <ShoppingBag className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                    <p className="text-sm text-gray-500">Total Order</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Branches Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredBranches.map((branch) => (
              <motion.div
                key={branch.id}
                variants={itemVariants}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className={`relative overflow-hidden transition-shadow hover:shadow-lg ${!branch.isActive ? "opacity-70" : ""}`}>
                  {/* Status indicator */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${branch.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{branch.name}</CardTitle>
                        <Badge variant={branch.isActive ? "default" : "secondary"}>
                          {branch.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={(props) => (
                            <Button {...props} variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          )}
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Cabang
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(branch.id, branch.isActive, branch.name)}>
                            {branch.isActive ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-2" />
                                Nonaktifkan
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-2" />
                                Aktifkan
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openQRDialog(branch)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            QR Code Pembayaran
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Pengaturan Cabang
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{branch.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{branch.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Dibuat {formatDate(branch.createdAt)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {branch.stats?.totalOrders || 0}
                        </p>
                        <p className="text-xs text-gray-500">Order</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(branch.stats?.totalRevenue || 0).replace("Rp", "")}
                        </p>
                        <p className="text-xs text-gray-500">Pendapatan</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-600">
                          {branch.stats?.staffCount || 0}
                        </p>
                        <p className="text-xs text-gray-500">Staff</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredBranches.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Tidak ada cabang</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery
                ? "Coba ubah kata kunci pencarian"
                : "Mulai dengan menambahkan cabang pertama"}
            </p>
          </motion.div>
        )}

        {/* Add Branch Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tambah Cabang Baru</DialogTitle>
              <DialogDescription>
                Buat cabang baru untuk bisnis laundry Anda
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Cabang *</Label>
                <Input
                  id="name"
                  placeholder="Contoh: VibeClean Sudirman"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Alamat Lengkap *</Label>
                <Textarea
                  id="address"
                  placeholder="Jl. Sudirman No. 123, Jakarta Pusat"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Nomor Telepon *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="021-5551234"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Aktifkan Cabang</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button onClick={handleAddBranch} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Tambah Cabang"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Branch Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Cabang</DialogTitle>
              <DialogDescription>
                Perbarui informasi cabang
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nama Cabang *</Label>
                <Input
                  id="edit-name"
                  placeholder="Contoh: VibeClean Sudirman"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Alamat Lengkap *</Label>
                <Textarea
                  id="edit-address"
                  placeholder="Jl. Sudirman No. 123, Jakarta Pusat"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Nomor Telepon *</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="021-5551234"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Aktifkan Cabang</Label>
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button onClick={handleEditBranch} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Pembayaran
              </DialogTitle>
              <DialogDescription>
                {selectedBranchName} - Pelanggan dapat scan untuk melakukan pembayaran
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Size Selection */}
              {!qrCodeData && (
                <div className="space-y-2">
                  <Label>Pilih Ukuran</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => generateQRCode("small")}
                      disabled={isGeneratingQR}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="text-xs">Kecil</span>
                      <span className="text-[10px] text-gray-500">200px</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateQRCode("medium")}
                      disabled={isGeneratingQR}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="text-xs">Sedang</span>
                      <span className="text-[10px] text-gray-500">300px</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateQRCode("large")}
                      disabled={isGeneratingQR}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="text-xs">Besar</span>
                      <span className="text-[10px] text-gray-500">400px</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isGeneratingQR && (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-500 mt-2">Membuat QR Code...</p>
                </div>
              )}

              {/* QR Code Display */}
              {qrCodeData && !isGeneratingQR && (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrCodeData.qrCode} 
                      alt="QR Code Pembayaran" 
                      className="w-48 h-48"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Link Pembayaran</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={qrCodeData.paymentUrl} 
                        readOnly 
                        className="text-xs"
                      />
                      <Button variant="outline" size="icon" onClick={copyPaymentUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadQR} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const printWindow = window.open("", "_blank");
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>QR Code - ${selectedBranchName}</title>
                                <style>
                                  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                                  img { max-width: 300px; }
                                  .label { text-align: center; margin-top: 20px; font-family: sans-serif; }
                                </style>
                              </head>
                              <body>
                                <img src="${qrCodeData.qrCode}" />
                                <div class="label">
                                  <h2>${selectedBranchName}</h2>
                                  <p>Scan untuk membayar</p>
                                </div>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }} 
                      className="flex-1"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button onClick={() => generateQRCode("medium")} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
