"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  UserPlus,
  Loader2,
  Building2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGuard, RoleBadge } from "@/components/common/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuLabel,
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useStaff, type StaffMember } from "@/hooks/use-staff";
import { useBranches } from "@/hooks/use-branches";
import { formatDate } from "@/lib/utils";
import { inviteStaffSchema, type InviteStaffInput } from "@/lib/validations/schemas";
import type { UserRole } from "@/types";

// ============================================
// ROLE LABELS
// ============================================

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Kasir",
  courier: "Kurir",
};

// ============================================
// INVITE STAFF DIALOG
// ============================================

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: InviteStaffInput) => Promise<void>;
}

function InviteStaffDialog({ open, onOpenChange, onInvite }: InviteStaffDialogProps) {
  const { branches, isLoading: branchesLoading } = useBranches();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchPermissionsState, setBranchPermissionsState] = useState<
    Record<string, UserRole[]>
  >({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      email: "",
      branchPermissions: [],
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      reset({ email: "", branchPermissions: [] });
      setBranchPermissionsState({});
    }
  }, [open, reset]);

  // Sync branchPermissions state to form
  const updateFormBranchPermissions = (newState: Record<string, UserRole[]>) => {
    const permissionsArray = Object.entries(newState)
      .filter(([_, roles]) => roles.length > 0)
      .map(([branchId, roles]) => ({ branchId, roles }));
    setValue("branchPermissions", permissionsArray, { shouldValidate: true });
  };

  const toggleRole = (branchId: string, role: UserRole) => {
    setBranchPermissionsState((prev) => {
      const currentRoles = prev[branchId] || [];
      const hasRoleInBranch = currentRoles.includes(role);
      let newState: Record<string, UserRole[]>;

      if (hasRoleInBranch) {
        const newRoles = currentRoles.filter((r) => r !== role);
        if (newRoles.length === 0) {
          const { [branchId]: _, ...rest } = prev;
          newState = rest;
        } else {
          newState = { ...prev, [branchId]: newRoles };
        }
      } else {
        newState = { ...prev, [branchId]: [...currentRoles, role] };
      }

      updateFormBranchPermissions(newState);
      return newState;
    });
  };

  const hasRole = (branchId: string, role: UserRole) => {
    return branchPermissionsState[branchId]?.includes(role) || false;
  };

  const onSubmit = async (data: InviteStaffInput) => {
    setIsSubmitting(true);
    try {
      await onInvite(data);
      onOpenChange(false);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchPermissions = branchPermissionsState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Undang Karyawan Baru
          </DialogTitle>
          <DialogDescription>
            Kirim undangan ke email karyawan dan atur peran mereka di setiap cabang
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Karyawan</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="invite-email"
                type="email"
                placeholder="karyawan@email.com"
                {...register("email")}
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <Separator />

          {/* Branch & Role Selection */}
          <div className="flex-1 overflow-hidden">
            <Label className="mb-2 block">Pilih Peran per Cabang</Label>
            <p className="text-xs text-gray-500 mb-3">
              Karyawan dapat memiliki peran berbeda di setiap cabang (multi-role)
            </p>

            {branchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Belum ada cabang. Tambahkan cabang terlebih dahulu.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {branches.filter(b => b.isActive).map((branch) => {
                    const selectedRoles = branchPermissions[branch.id] || [];
                    const isSelected = selectedRoles.length > 0;

                    return (
                      <Card
                        key={branch.id}
                        className={`transition-all ${
                          isSelected ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {branch.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {branch.address}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {(["manager", "cashier", "courier"] as UserRole[]).map((role) => {
                              const isChecked = hasRole(branch.id, role);
                              return (
                                <label
                                  key={role}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                    isChecked
                                      ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30"
                                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleRole(branch.id, role)}
                                  />
                                  <span className="text-sm">{ROLE_LABELS[role]}</span>
                                </label>
                              );
                            })}
                          </div>
                          {selectedRoles.length > 0 && (
                            <div className="flex gap-1 mt-3">
                              <span className="text-xs text-gray-500">Dipilih:</span>
                              {selectedRoles.map((role) => (
                                <RoleBadge key={role} role={role} size="sm" />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            {errors.branchPermissions && (
              <p className="text-sm text-red-500 mt-2">{errors.branchPermissions.message}</p>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Kirim Undangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// STAFF MOBILE CARD
// ============================================

interface StaffMobileCardProps {
  staff: StaffMember;
  onEdit: (staff: StaffMember) => void;
  onRemove: (staff: StaffMember) => void;
}

function StaffMobileCard({ staff, onEdit, onRemove }: StaffMobileCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header - Avatar, Name, Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={staff.image || undefined} />
            <AvatarFallback className="text-lg">{staff.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{staff.name}</p>
            <p className="text-sm text-gray-500">{staff.email}</p>
          </div>
        </div>
        <Badge variant={staff.emailVerified ? "default" : "secondary"}>
          {staff.emailVerified ? "Aktif" : "Pending"}
        </Badge>
      </div>

      {/* Roles per Branch */}
      <div className="space-y-2 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3">
        <p className="text-xs font-medium text-gray-500 uppercase">Peran per Cabang</p>
        {staff.permissions.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada peran</p>
        ) : (
          staff.permissions.map((perm) => (
            <div key={perm.branchId} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {perm.branchName}
              </span>
              <div className="flex gap-1 flex-wrap justify-end">
                {perm.roles.map((role) => (
                  <RoleBadge key={role} role={role} size="sm" />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Join Date */}
      <div className="text-sm text-gray-500">
        Bergabung: {formatDate(staff.joinedAt)}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onEdit(staff)}
        >
          Edit Peran
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <Button {...props} variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            )}
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onRemove(staff)}
            >
              Hapus Karyawan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// STAFF TABLE ROW
// ============================================

interface StaffRowProps {
  staff: StaffMember;
  onEdit: (staff: StaffMember) => void;
  onRemove: (staff: StaffMember) => void;
}

function StaffRow({ staff, onEdit, onRemove }: StaffRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={staff.image || undefined} />
            <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{staff.name}</p>
            <p className="text-sm text-gray-500">{staff.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          {staff.permissions.length === 0 ? (
            <span className="text-sm text-gray-500">Belum ada peran</span>
          ) : (
            staff.permissions.map((perm) => (
              <div key={perm.branchId} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 min-w-[120px]">
                  {perm.branchName}:
                </span>
                <div className="flex gap-1 flex-wrap">
                  {perm.roles.map((role) => (
                    <RoleBadge key={role} role={role} size="sm" />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={staff.emailVerified ? "default" : "secondary"}>
          {staff.emailVerified ? "Aktif" : "Pending"}
        </Badge>
      </TableCell>
      <TableCell className="text-gray-500">
        {formatDate(staff.joinedAt)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <Button {...props} variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            )}
          />
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(staff)}>
              Edit Peran
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onRemove(staff)}
            >
              Hapus Karyawan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============================================
// MAIN STAFF PAGE
// ============================================

export default function StaffPage() {
  const { isAuthenticated } = useAuth();
  const { staff, isLoading, error, refetch, inviteStaff, removeStaff } = useStaff();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Filter staff
  const filteredStaff = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle invite
  const handleInvite = async (data: { email: string; branchPermissions: { branchId: string; roles: UserRole[] }[] }) => {
    try {
      await inviteStaff({
        email: data.email,
        branchPermissions: data.branchPermissions,
      });
      gooeyToast.success("Undangan Terkirim", { 
        description: `Undangan berhasil dikirim ke ${data.email}` 
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengirim undangan";
      gooeyToast.error("Gagal", { description: message });
      throw err;
    }
  };

  // Handle remove
  const handleRemove = async (member: StaffMember) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${member.name} dari organisasi?`)) {
      return;
    }
    
    try {
      await removeStaff(member.memberId);
      gooeyToast.success("Berhasil", { 
        description: `${member.name} berhasil dihapus dari organisasi` 
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus karyawan";
      gooeyToast.error("Gagal", { description: message });
    }
  };

  // Auth check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <a href="/login" className="text-blue-600 hover:underline">
          Silakan login
        </a>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Manajemen Karyawan">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500">Memuat data karyawan...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout title="Manajemen Karyawan">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gagal Memuat Data</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manajemen Karyawan">
      <PermissionGuard
        feature="staff"
        fallback={
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Anda tidak memiliki akses ke halaman ini</p>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Daftar Karyawan</h2>
              <p className="text-sm text-gray-500">
                Kelola karyawan dan atur peran mereka di setiap cabang
              </p>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Undang Karyawan
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Multi-Role Info Card */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    Multi-Role per Cabang
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Setiap karyawan dapat memiliki peran berbeda di setiap cabang. 
                    Contoh: Budi bisa menjadi Manager di Cabang Sudirman, 
                    tapi hanya sebagai Kasir di Cabang Thamrin.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff List */}
          <Card>
            <CardContent className="p-4 md:p-0">
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {filteredStaff.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery
                      ? "Tidak ada karyawan yang cocok dengan pencarian"
                      : "Belum ada karyawan. Klik 'Undang Karyawan' untuk menambahkan."}
                  </div>
                ) : (
                  filteredStaff.map((member) => (
                    <StaffMobileCard
                      key={member.id}
                      staff={member}
                      onEdit={setEditingStaff}
                      onRemove={handleRemove}
                    />
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Peran per Cabang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bergabung</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          {searchQuery
                            ? "Tidak ada karyawan yang cocok dengan pencarian"
                            : "Belum ada karyawan. Klik 'Undang Karyawan' untuk menambahkan."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((member) => (
                        <StaffRow
                          key={member.id}
                          staff={member}
                          onEdit={setEditingStaff}
                          onRemove={handleRemove}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Dialog */}
        <InviteStaffDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          onInvite={handleInvite}
        />
      </PermissionGuard>
    </DashboardLayout>
  );
}
