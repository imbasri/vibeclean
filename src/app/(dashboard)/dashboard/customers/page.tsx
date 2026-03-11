"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion";
import {
  Plus,
  Search,
  Edit2,
  MoreHorizontal,
  Users,
  Star,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  Gift,
  UserPlus,
  Eye,
  MessageSquare,
  Trash2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGuard } from "@/components/common/permission-guard";
import {
  FormInputField,
  FormTextareaField,
  FormRow,
  LoadingButtonContent,
  DeleteConfirmDialog,
} from "@/components/common";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validations/schemas";
import { useCustomers } from "@/hooks/use-customers";
import type { Customer } from "@/types";

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

// Helper function to get loyalty tier
function getLoyaltyTier(points: number): { tier: string; color: string } {
  if (points >= 2000) return { tier: "VIP", color: "bg-amber-100 text-amber-700" };
  if (points >= 1000) return { tier: "Gold", color: "bg-yellow-100 text-yellow-700" };
  if (points >= 500) return { tier: "Silver", color: "bg-muted text-muted-foreground" };
  return { tier: "Bronze", color: "bg-orange-100 text-orange-700" };
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "totalSpent" | "totalOrders" | "memberSince">("totalSpent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Use the customers hook
  const { 
    customers, 
    isLoading, 
    error, 
    createCustomer, 
    updateCustomer, 
    deleteCustomer,
    refetch 
  } = useCustomers();
  
  // Modal states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // React Hook Form for Add Customer
  const addForm = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // React Hook Form for Edit Customer
  const editForm = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // Reset add form when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      addForm.reset();
    }
  }, [isAddDialogOpen, addForm]);

  // Populate edit form when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer && isEditDialogOpen) {
      editForm.reset({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email || "",
        address: selectedCustomer.address || "",
      });
    }
  }, [selectedCustomer, isEditDialogOpen, editForm]);

  // Filter and sort customers (memoized)
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((customer) => {
        const matchesSearch = 
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone.includes(searchQuery) ||
          customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "totalSpent":
            comparison = a.totalSpent - b.totalSpent;
            break;
          case "totalOrders":
            comparison = a.totalOrders - b.totalOrders;
            break;
          case "memberSince":
            comparison = new Date(a.memberSince).getTime() - new Date(b.memberSince).getTime();
            break;
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [customers, searchQuery, sortBy, sortOrder]);

  // Stats
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgOrderValue = customers.length > 0
    ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(customers.reduce((sum, c) => sum + c.totalOrders, 0), 1)
    : 0;
  const vipCustomers = customers.filter((c) => c.loyaltyPoints >= 2000).length;

  // Handlers
  const handleAddCustomer = async (data: CreateCustomerInput) => {
    try {
      const newCustomer = await createCustomer(data);
      if (newCustomer) {
        setIsAddDialogOpen(false);
        addForm.reset();
        await refetch();
        gooeyToast.success("Pelanggan Ditambahkan", { description: `${newCustomer.name} berhasil ditambahkan` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menambahkan pelanggan";
      gooeyToast.error("Gagal", { description: message });
    }
  };

  const handleEditCustomer = async (data: CreateCustomerInput) => {
    if (!selectedCustomer) return;

    try {
      const updated = await updateCustomer(selectedCustomer.id, data);
      if (updated) {
        setIsEditDialogOpen(false);
        setSelectedCustomer(null);
        await refetch();
        gooeyToast.success("Pelanggan Diperbarui", { description: `${data.name} berhasil diperbarui` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui pelanggan";
      gooeyToast.error("Gagal", { description: message });
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      const success = await deleteCustomer(customerToDelete.id);
      if (success) {
        await refetch();
        gooeyToast.success("Pelanggan Dihapus", {
          description: `${customerToDelete.name} berhasil dihapus`,
        });
        setCustomerToDelete(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus pelanggan";
      gooeyToast.error("Gagal", { description: message });
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleExport = async () => {
    try {
      gooeyToast.success("Export Dimulai", { description: "Laporan pelanggan sedang diunduh..." });
      const response = await fetch("/api/customers/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-pelanggan-${new Date().toISOString().split("T")[0]}.xlsx`;
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
          <h1 className="text-2xl font-bold text-foreground">Pelanggan</h1>
          <p className="text-muted-foreground mt-1">Kelola data pelanggan dan loyalty program</p>
        </div>
        <PermissionGuard allowedRoles={["owner", "manager"]}>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </PermissionGuard>
        <PermissionGuard allowedRoles={["owner", "manager", "cashier"]}>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Tambah Pelanggan
          </Button>
        </PermissionGuard>
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
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : totalCustomers}</p>
                  <p className="text-sm text-muted-foreground">Total Pelanggan</p>
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
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : formatCurrency(totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Pendapatan</p>
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
                  <ShoppingBag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : formatCurrency(avgOrderValue)}</p>
                  <p className="text-sm text-muted-foreground">Rata-rata Order</p>
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
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : vipCustomers}</p>
                  <p className="text-sm text-muted-foreground">Pelanggan VIP</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, telepon, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Customers List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: easeOut }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pelanggan</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium text-foreground">Gagal memuat data</h3>
                <p className="text-muted-foreground mt-1">{error}</p>
              </div>
            )}

            {/* Mobile Card View */}
            {!isLoading && !error && (
            <>
            <div className="block md:hidden space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredCustomers.map((customer) => {
                  const loyalty = getLoyaltyTier(customer.loyaltyPoints);
                  return (
                    <motion.div
                      key={customer.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Header - Avatar, Name, Loyalty Badge */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold">{customer.name}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={loyalty.color}>{loyalty.tier}</Badge>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2 py-2 bg-muted/50 rounded-lg px-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{customer.totalOrders}</p>
                          <p className="text-xs text-muted-foreground">Order</p>
                        </div>
                        <div className="text-center border-x border-border">
                          <p className="text-lg font-bold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                          <p className="text-xs text-muted-foreground">Belanja</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Gift className="h-3 w-3 text-amber-500" />
                            <p className="text-lg font-bold text-amber-600">{customer.loyaltyPoints}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Poin</p>
                        </div>
                      </div>

                      {/* Email & Member Since */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Member sejak {formatDate(customer.memberSince)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openViewDialog(customer)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                        <PermissionGuard allowedRoles={["owner", "manager", "cashier"]}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </PermissionGuard>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            gooeyToast.success("WhatsApp", { description: `Membuka WhatsApp untuk ${customer.name}...` });
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <PermissionGuard allowedRoles={["owner", "manager"]}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDeleteDialog(customer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("name")}
                    >
                      Pelanggan {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort("totalOrders")}
                    >
                      Total Order {sortBy === "totalOrders" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort("totalSpent")}
                    >
                      Total Belanja {sortBy === "totalSpent" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="text-center">Loyalty</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("memberSince")}
                    >
                      Member Sejak {sortBy === "memberSince" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredCustomers.map((customer) => {
                      const loyalty = getLoyaltyTier(customer.loyaltyPoints);
                      return (
                        <motion.tr
                          key={customer.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                {customer.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                {customer.address && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {customer.address}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{customer.phone}</span>
                              </div>
                              {customer.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-[150px]">{customer.email}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {customer.totalOrders}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(customer.totalSpent)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge className={loyalty.color}>{loyalty.tier}</Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Gift className="h-3 w-3" />
                                <span>{customer.loyaltyPoints} pts</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(customer.memberSince)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={(props) => (
                                  <Button {...props} variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                )}
                              />
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openViewDialog(customer)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <PermissionGuard allowedRoles={["owner", "manager", "cashier"]}>
                                  <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Pelanggan
                                  </DropdownMenuItem>
                                </PermissionGuard>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  gooeyToast.success("WhatsApp", { description: `Membuka WhatsApp untuk ${customer.name}...` });
                                }}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Hubungi WhatsApp
                                </DropdownMenuItem>
                                <PermissionGuard allowedRoles={["owner", "manager"]}>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteDialog(customer)}
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Hapus Pelanggan
                                  </DropdownMenuItem>
                                </PermissionGuard>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Empty State - shows for both mobile and desktop */}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">Tidak ada pelanggan</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery
                    ? "Coba ubah kata kunci pencarian"
                    : "Mulai dengan menambahkan pelanggan pertama"}
                </p>
              </div>
            )}
            </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
            <DialogDescription>
              Daftarkan pelanggan baru untuk program loyalty
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddCustomer)}>
            <div className="grid gap-4 py-4">
              <FormInputField
                label="Nama Lengkap"
                placeholder="Contoh: Dewi Lestari"
                required
                error={addForm.formState.errors.name?.message}
                {...addForm.register("name")}
              />
              <FormInputField
                label="Nomor Telepon"
                type="tel"
                placeholder="081234567890"
                required
                error={addForm.formState.errors.phone?.message}
                {...addForm.register("phone")}
              />
              <FormInputField
                label="Email"
                type="email"
                placeholder="email@example.com"
                description="Opsional"
                error={addForm.formState.errors.email?.message}
                {...addForm.register("email")}
              />
              <FormTextareaField
                label="Alamat"
                placeholder="Alamat lengkap..."
                rows={3}
                description="Opsional"
                error={addForm.formState.errors.address?.message}
                {...addForm.register("address")}
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)} 
                disabled={addForm.formState.isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={addForm.formState.isSubmitting}>
                <LoadingButtonContent isLoading={addForm.formState.isSubmitting} loadingText="Menyimpan...">
                  Tambah Pelanggan
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pelanggan</DialogTitle>
            <DialogDescription>
              Perbarui informasi pelanggan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditCustomer)}>
            <div className="grid gap-4 py-4">
              <FormInputField
                label="Nama Lengkap"
                placeholder="Contoh: Dewi Lestari"
                required
                error={editForm.formState.errors.name?.message}
                {...editForm.register("name")}
              />
              <FormInputField
                label="Nomor Telepon"
                type="tel"
                placeholder="081234567890"
                required
                error={editForm.formState.errors.phone?.message}
                {...editForm.register("phone")}
              />
              <FormInputField
                label="Email"
                type="email"
                placeholder="email@example.com"
                description="Opsional"
                error={editForm.formState.errors.email?.message}
                {...editForm.register("email")}
              />
              <FormTextareaField
                label="Alamat"
                placeholder="Alamat lengkap..."
                rows={3}
                description="Opsional"
                error={editForm.formState.errors.address?.message}
                {...editForm.register("address")}
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)} 
                disabled={editForm.formState.isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                <LoadingButtonContent isLoading={editForm.formState.isSubmitting} loadingText="Menyimpan...">
                  Simpan Perubahan
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Pelanggan</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                  <Badge className={getLoyaltyTier(selectedCustomer.loyaltyPoints).color}>
                    {getLoyaltyTier(selectedCustomer.loyaltyPoints).tier} Member
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Member sejak {formatDate(selectedCustomer.memberSince)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedCustomer.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total Order</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedCustomer.totalSpent)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Belanja</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{selectedCustomer.loyaltyPoints}</p>
                  <p className="text-xs text-muted-foreground">Poin Loyalty</p>
                </div>
              </div>

              {/* Loyalty Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress ke tier berikutnya</span>
                  <span className="font-medium">
                    {selectedCustomer.loyaltyPoints >= 2000
                      ? "VIP (Maksimal)"
                      : selectedCustomer.loyaltyPoints >= 1000
                      ? `${2000 - selectedCustomer.loyaltyPoints} poin lagi ke VIP`
                      : selectedCustomer.loyaltyPoints >= 500
                      ? `${1000 - selectedCustomer.loyaltyPoints} poin lagi ke Gold`
                      : `${500 - selectedCustomer.loyaltyPoints} poin lagi ke Silver`}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                    style={{
                      width: `${Math.min(
                        (selectedCustomer.loyaltyPoints / 2000) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Tutup
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedCustomer) openEditDialog(selectedCustomer);
            }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        itemName={customerToDelete?.name || ""}
        itemType="Pelanggan"
        onConfirm={handleDeleteCustomer}
      />
    </div>
  );
}
