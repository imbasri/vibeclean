"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  MoreHorizontal,
  Package,
  Clock,
  DollarSign,
  Filter,
  ToggleLeft,
  ToggleRight,
  Tag,
  Layers,
  Loader2,
  AlertCircle,
  Download,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PermissionGuard } from "@/components/common/permission-guard";
import {
  FormInputField,
  FormTextareaField,
  FormRow,
  DeleteConfirmDialog,
  LoadingButtonContent,
} from "@/components/common";
import { useAuth } from "@/contexts/auth-context";
import { useServices } from "@/hooks/use-services";
import { formatCurrency } from "@/lib/utils";
import { createServiceSchema, type CreateServiceInput } from "@/lib/validations/schemas";
import type { LaundryService, ServiceCategory, ServiceUnit } from "@/types";

// Animation config
const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      ease: easeOut,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: easeOut }
  },
};

// Category display config
const categoryConfig: Record<ServiceCategory, { label: string; color: string }> = {
  cuci: { label: "Cuci", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  setrika: { label: "Setrika", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
  cuci_setrika: { label: "Cuci + Setrika", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
  dry_clean: { label: "Dry Clean", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
  express: { label: "Express", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  khusus: { label: "Khusus", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
};

const unitLabels: Record<ServiceUnit, string> = {
  kg: "Kilogram",
  pcs: "Pieces",
  meter: "Meter",
  pasang: "Pasang",
};

// Default form values
const defaultFormValues: CreateServiceInput = {
  name: "",
  category: "cuci",
  unit: "kg",
  price: 0,
  estimatedDays: 3,
  description: "",
};

export default function ServicesPage() {
  const { user } = useAuth();
  
  // Use real API via hook
  const {
    services,
    isLoading: isLoadingServices,
    error: servicesError,
    createService,
    updateService,
    deleteService,
    toggleServiceStatus,
  } = useServices({
    branchId: user?.activeBranchId || undefined,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Modal states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<LaundryService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActiveToggle, setIsActiveToggle] = useState(true);
  const [editIsActiveToggle, setEditIsActiveToggle] = useState(true);

  // React Hook Form instances
  const addForm = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: defaultFormValues,
  });

  const editForm = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: defaultFormValues,
  });

  // Reset add form when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      addForm.reset(defaultFormValues);
      setIsActiveToggle(true);
    }
  }, [isAddDialogOpen, addForm]);

  // Reset edit form when dialog opens with selected service data
  useEffect(() => {
    if (isEditDialogOpen && selectedService) {
      editForm.reset({
        name: selectedService.name,
        category: selectedService.category,
        unit: selectedService.unit,
        price: selectedService.price,
        estimatedDays: selectedService.estimatedDays,
        description: selectedService.description || "",
      });
      setEditIsActiveToggle(selectedService.isActive);
    }
  }, [isEditDialogOpen, selectedService, editForm]);

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" ? service.isActive : !service.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.isActive).length;
  const avgPrice = services.length > 0 
    ? services.reduce((sum, s) => sum + s.price, 0) / services.length 
    : 0;
  const categories = [...new Set(services.map((s) => s.category))].length;

  // Handlers
  const handleAddService = async (data: CreateServiceInput) => {
    if (!user?.activeBranchId) {
      gooeyToast.error("Error", { description: "Pilih cabang terlebih dahulu" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newService = await createService({
        ...data,
        branchId: user.activeBranchId,
        isActive: isActiveToggle,
      });

      if (newService) {
        setIsAddDialogOpen(false);
        gooeyToast.success("Layanan Ditambahkan", { description: `${newService.name} berhasil ditambahkan` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan layanan";
      gooeyToast.error("Error", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditService = async (data: CreateServiceInput) => {
    if (!selectedService) return;

    setIsSubmitting(true);
    
    try {
      const updatedService = await updateService(selectedService.id, {
        ...data,
        isActive: editIsActiveToggle,
      });

      if (updatedService) {
        setIsEditDialogOpen(false);
        setSelectedService(null);
        gooeyToast.success("Layanan Diperbarui", { description: `${data.name} berhasil diperbarui` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui layanan";
      gooeyToast.error("Error", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    try {
      const success = await deleteService(selectedService.id);
      if (success) {
        setIsDeleteDialogOpen(false);
        gooeyToast.success("Layanan Dihapus", { description: `${selectedService.name} berhasil dihapus` });
        setSelectedService(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus layanan";
      gooeyToast.error("Error", { description: message });
    }
  };

  const handleToggleStatus = async (service: LaundryService) => {
    try {
      const updatedService = await toggleServiceStatus(service.id, !service.isActive);
      if (updatedService) {
        gooeyToast.success(
          service.isActive ? "Layanan Dinonaktifkan" : "Layanan Diaktifkan",
          { description: `${service.name} ${service.isActive ? "dinonaktifkan" : "diaktifkan"}` }
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengubah status layanan";
      gooeyToast.error("Error", { description: message });
    }
  };

  const openEditDialog = (service: LaundryService) => {
    setSelectedService(service);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (service: LaundryService) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      gooeyToast.success("Export Dimulai", { description: "Laporan layanan sedang diunduh..." });
      const response = await fetch("/api/services/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-layanan-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      gooeyToast.error("Export Gagal", { description: "Gagal mengunduh laporan" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Layanan</h1>
          <p className="text-muted-foreground mt-1">Kelola layanan laundry di cabang ini</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard allowedRoles={["owner", "manager"]}>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
          <PermissionGuard allowedRoles={["owner", "manager"]}>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Layanan
            </Button>
          </PermissionGuard>
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoadingServices && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Memuat layanan...</span>
        </div>
      )}

      {/* Error State */}
      {servicesError && !isLoadingServices && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">Gagal memuat layanan</h3>
            <p className="text-muted-foreground mt-1">{servicesError}</p>
          </div>
        </div>
      )}

      {/* Content - only show when not loading and no error */}
      {!isLoadingServices && !servicesError && (
        <>
          {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{totalServices}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Total Layanan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                  <ToggleRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{activeServices}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Layanan Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{formatCurrency(avgPrice)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Rata-rata Harga</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                  <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{categories}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">Kategori</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari layanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ServiceCategory | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {Object.entries(categoryConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Services Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              variants={itemVariants}
              layout
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className={`relative overflow-hidden transition-shadow hover:shadow-md ${!service.isActive ? "opacity-60" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <Badge className={categoryConfig[service.category].color}>
                        {categoryConfig[service.category].label}
                      </Badge>
                    </div>
                    <PermissionGuard allowedRoles={["owner", "manager"]}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={(props) => (
                            <Button {...props} variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          )}
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(service)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Layanan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(service)}>
                            {service.isActive ? (
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
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(service)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus Layanan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PermissionGuard>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span>per {service.unit}</span>
                    </div>
                    <span className="font-semibold text-lg text-primary">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Estimasi {service.estimatedDays} hari</span>
                    </div>
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredServices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Tidak ada layanan</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
              ? "Coba ubah filter pencarian Anda"
              : "Mulai dengan menambahkan layanan pertama"}
          </p>
        </motion.div>
      )}
        </>
      )}

      {/* Add Service Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Layanan Baru</DialogTitle>
            <DialogDescription>
              Tambahkan layanan laundry baru ke cabang ini
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddService)}>
            <div className="grid gap-4 py-4">
              <FormInputField
                label="Nama Layanan"
                placeholder="Contoh: Cuci Kiloan Regular"
                required
                error={addForm.formState.errors.name?.message}
                {...addForm.register("name")}
              />
              <FormRow>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="flex items-center gap-1">
                    Kategori
                  </Label>
                  <Select 
                    value={addForm.watch("category")} 
                    onValueChange={(v) => addForm.setValue("category", v as ServiceCategory)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addForm.formState.errors.category?.message && (
                    <p className="text-sm text-red-500">{addForm.formState.errors.category.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit" className="flex items-center gap-1">
                    Satuan
                  </Label>
                  <Select 
                    value={addForm.watch("unit")} 
                    onValueChange={(v) => addForm.setValue("unit", v as ServiceUnit)}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(unitLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addForm.formState.errors.unit?.message && (
                    <p className="text-sm text-red-500">{addForm.formState.errors.unit.message}</p>
                  )}
                </div>
              </FormRow>
              <FormRow>
                <FormInputField
                  label="Harga (Rp)"
                  type="number"
                  placeholder="10000"
                  required
                  error={addForm.formState.errors.price?.message}
                  {...addForm.register("price", { valueAsNumber: true })}
                />
                <FormInputField
                  label="Estimasi (hari)"
                  type="number"
                  placeholder="3"
                  error={addForm.formState.errors.estimatedDays?.message}
                  {...addForm.register("estimatedDays", { valueAsNumber: true })}
                />
              </FormRow>
              <FormTextareaField
                label="Deskripsi"
                placeholder="Deskripsi singkat layanan..."
                rows={3}
                error={addForm.formState.errors.description?.message}
                {...addForm.register("description")}
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Aktifkan Layanan</Label>
                <Switch
                  id="isActive"
                  checked={isActiveToggle}
                  onCheckedChange={setIsActiveToggle}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <LoadingButtonContent isLoading={isSubmitting} loadingText="Menyimpan...">
                  Tambah Layanan
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Layanan</DialogTitle>
            <DialogDescription>
              Perbarui informasi layanan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditService)}>
            <div className="grid gap-4 py-4">
              <FormInputField
                label="Nama Layanan"
                placeholder="Contoh: Cuci Kiloan Regular"
                required
                error={editForm.formState.errors.name?.message}
                {...editForm.register("name")}
              />
              <FormRow>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category" className="flex items-center gap-1">
                    Kategori
                  </Label>
                  <Select 
                    value={editForm.watch("category")} 
                    onValueChange={(v) => editForm.setValue("category", v as ServiceCategory)}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editForm.formState.errors.category?.message && (
                    <p className="text-sm text-red-500">{editForm.formState.errors.category.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-unit" className="flex items-center gap-1">
                    Satuan
                  </Label>
                  <Select 
                    value={editForm.watch("unit")} 
                    onValueChange={(v) => editForm.setValue("unit", v as ServiceUnit)}
                  >
                    <SelectTrigger id="edit-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(unitLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editForm.formState.errors.unit?.message && (
                    <p className="text-sm text-red-500">{editForm.formState.errors.unit.message}</p>
                  )}
                </div>
              </FormRow>
              <FormRow>
                <FormInputField
                  label="Harga (Rp)"
                  type="number"
                  placeholder="10000"
                  required
                  error={editForm.formState.errors.price?.message}
                  {...editForm.register("price", { valueAsNumber: true })}
                />
                <FormInputField
                  label="Estimasi (hari)"
                  type="number"
                  placeholder="3"
                  error={editForm.formState.errors.estimatedDays?.message}
                  {...editForm.register("estimatedDays", { valueAsNumber: true })}
                />
              </FormRow>
              <FormTextareaField
                label="Deskripsi"
                placeholder="Deskripsi singkat layanan..."
                rows={3}
                error={editForm.formState.errors.description?.message}
                {...editForm.register("description")}
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Aktifkan Layanan</Label>
                <Switch
                  id="edit-isActive"
                  checked={editIsActiveToggle}
                  onCheckedChange={setEditIsActiveToggle}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <LoadingButtonContent isLoading={isSubmitting} loadingText="Menyimpan...">
                  Simpan Perubahan
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        itemName={selectedService?.name || ""}
        itemType="layanan"
        onConfirm={handleDeleteService}
      />
    </div>
  );
}
