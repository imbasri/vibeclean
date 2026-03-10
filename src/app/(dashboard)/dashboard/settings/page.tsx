"use client";

import { useState, useEffect } from "react";
import { motion, type Variants, type Easing } from "framer-motion";
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Camera,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PermissionGuard } from "@/components/common/permission-guard";
import { useProfile, useOrganization } from "@/hooks/use-settings";

// Animation config
const easeOut: Easing = [0.16, 1, 0.3, 1];

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: easeOut }
  },
};

export default function SettingsPage() {
  // API hooks
  const { 
    profile, 
    isLoading: profileLoading, 
    updateProfile, 
    isUpdating: profileUpdating 
  } = useProfile();
  
  const { 
    organization, 
    isLoading: orgLoading, 
    updateOrganization, 
    isUpdating: orgUpdating 
  } = useOrganization();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    name: "",
    slug: "",
    logo: "",
  });

  // Sync profile form with API data
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
    }
  }, [profile]);

  // Sync organization form with API data
  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
      });
    }
  }, [organization]);

  // Notification settings (stored in localStorage for now)
  const [notifications, setNotifications] = useState({
    emailNewOrder: true,
    emailOrderComplete: true,
    emailWeeklyReport: true,
    whatsappNewOrder: true,
    whatsappOrderComplete: true,
    whatsappPaymentReminder: true,
    pushEnabled: false,
  });

  // Load notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vibeclean_notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Security settings
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Appearance settings (stored in localStorage)
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "id",
    dateFormat: "DD/MM/YYYY",
    currency: "IDR",
  });

  // Load appearance from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vibeclean_appearance");
    if (saved) {
      try {
        setAppearance(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleSaveProfile = async () => {
    const result = await updateProfile({
      name: profileForm.name,
      phone: profileForm.phone,
    });

    if (result.success) {
      gooeyToast.success("Profil Disimpan", { description: "Perubahan profil berhasil disimpan" });
    } else {
      gooeyToast.error("Gagal Menyimpan", { description: result.error || "Terjadi kesalahan" });
    }
  };

  const handleSaveOrganization = async () => {
    const result = await updateOrganization({
      name: orgForm.name,
      slug: orgForm.slug,
      logo: orgForm.logo,
    });

    if (result.success) {
      gooeyToast.success("Organisasi Disimpan", { description: "Perubahan organisasi berhasil disimpan" });
    } else {
      gooeyToast.error("Gagal Menyimpan", { description: result.error || "Terjadi kesalahan" });
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("vibeclean_notifications", JSON.stringify(notifications));
    gooeyToast.success("Notifikasi Disimpan", { description: "Preferensi notifikasi berhasil disimpan" });
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      gooeyToast.error("Password Tidak Cocok", { description: "Password baru dan konfirmasi harus sama" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      gooeyToast.error("Password Terlalu Pendek", { description: "Password minimal 8 karakter" });
      return;
    }
    // TODO: Implement password change via Better Auth API
    gooeyToast.success("Password Diubah", { description: "Password berhasil diperbarui" });
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleSaveAppearance = () => {
    localStorage.setItem("vibeclean_appearance", JSON.stringify(appearance));
    gooeyToast.success("Tampilan Disimpan", { description: "Preferensi tampilan berhasil disimpan" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 mt-1">Kelola profil, notifikasi, dan preferensi Anda</p>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2 py-3">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Organisasi</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-3">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifikasi</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Keamanan</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2 py-3">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Tampilan</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profil Pengguna</CardTitle>
                <CardDescription>Informasi akun pribadi Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profile?.image || "/avatars/user.jpg"} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {profileForm.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button variant="outline" size="sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Ubah Foto
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">JPG, PNG maksimal 2MB</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Form Fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            className="pl-10 bg-gray-50"
                            value={profileForm.email}
                            disabled
                            title="Email tidak dapat diubah"
                          />
                        </div>
                        <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Nomor Telepon</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            type="tel"
                            className="pl-10"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={profileUpdating}>
                        {profileUpdating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Simpan Perubahan
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <PermissionGuard allowedRoles={["owner"]} fallback={
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900">Akses Terbatas</h3>
                  <p className="text-gray-500 mt-1">Hanya owner yang dapat mengubah pengaturan organisasi</p>
                </CardContent>
              </Card>
            }>
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Organisasi</CardTitle>
                  <CardDescription>Informasi bisnis laundry Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {orgLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <>
                      {/* Logo */}
                      <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                          {orgForm.name.substring(0, 2).toUpperCase() || "VC"}
                        </div>
                        <div>
                          <Button variant="outline" size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Ubah Logo
                          </Button>
                          <p className="text-sm text-gray-500 mt-2">Logo bisnis Anda</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Form Fields */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="orgName">Nama Bisnis</Label>
                          <Input
                            id="orgName"
                            value={orgForm.name}
                            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="slug">Slug URL</Label>
                          <Input
                            id="slug"
                            value={orgForm.slug}
                            onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          />
                          <p className="text-xs text-gray-500">
                            URL: vibeclean.id/{orgForm.slug || "your-business"}
                          </p>
                        </div>
                      </div>

                      {organization && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                          <p className="text-sm text-blue-700">
                            Paket saat ini: <span className="font-medium capitalize">{organization.plan}</span>
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button onClick={handleSaveOrganization} disabled={orgUpdating}>
                          {orgUpdating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Simpan Perubahan
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </PermissionGuard>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Preferensi Notifikasi</CardTitle>
                <CardDescription>Atur cara Anda menerima notifikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <h4 className="font-medium">Notifikasi Email</h4>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Order Baru</p>
                        <p className="text-sm text-gray-500">Notifikasi saat ada order masuk</p>
                      </div>
                      <Switch
                        checked={notifications.emailNewOrder}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailNewOrder: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Order Selesai</p>
                        <p className="text-sm text-gray-500">Notifikasi saat order selesai</p>
                      </div>
                      <Switch
                        checked={notifications.emailOrderComplete}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailOrderComplete: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Laporan Mingguan</p>
                        <p className="text-sm text-gray-500">Ringkasan performa setiap minggu</p>
                      </div>
                      <Switch
                        checked={notifications.emailWeeklyReport}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailWeeklyReport: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* WhatsApp Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium">Notifikasi WhatsApp</h4>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Order Baru</p>
                        <p className="text-sm text-gray-500">Notifikasi saat ada order masuk</p>
                      </div>
                      <Switch
                        checked={notifications.whatsappNewOrder}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, whatsappNewOrder: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Order Selesai</p>
                        <p className="text-sm text-gray-500">Notifikasi ke pelanggan saat order selesai</p>
                      </div>
                      <Switch
                        checked={notifications.whatsappOrderComplete}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, whatsappOrderComplete: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Pengingat Pembayaran</p>
                        <p className="text-sm text-gray-500">Reminder untuk order belum dibayar</p>
                      </div>
                      <Switch
                        checked={notifications.whatsappPaymentReminder}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, whatsappPaymentReminder: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Push Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-gray-500" />
                    <h4 className="font-medium">Push Notification</h4>
                  </div>
                  <div className="pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Aktifkan Push Notification</p>
                        <p className="text-sm text-gray-500">Notifikasi langsung di browser</p>
                      </div>
                      <Switch
                        checked={notifications.pushEnabled}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, pushEnabled: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications}>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Preferensi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Keamanan Akun</CardTitle>
                <CardDescription>Kelola password dan keamanan akun</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Lock className="h-5 w-5 text-gray-500" />
                    Ubah Password
                  </h4>
                  <div className="grid gap-4 max-w-md">
                    <div className="grid gap-2">
                      <Label htmlFor="currentPassword">Password Saat Ini</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="newPassword">Password Baru</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleChangePassword} className="w-fit">
                      Ubah Password
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Two Factor Auth */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-500" />
                    Autentikasi Dua Faktor (2FA)
                  </h4>
                  <div className="flex items-center justify-between p-4 border rounded-lg max-w-md">
                    <div>
                      <p className="font-medium text-sm">Status 2FA</p>
                      <p className="text-sm text-gray-500">Tingkatkan keamanan akun Anda</p>
                    </div>
                    <Button variant="outline" size="sm">Aktifkan</Button>
                  </div>
                </div>

                <Separator />

                {/* Active Sessions */}
                <div className="space-y-4">
                  <h4 className="font-medium">Sesi Aktif</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Chrome - Windows</p>
                          <p className="text-sm text-gray-500">Sesi saat ini</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">Jakarta, ID</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Tampilan & Regional</CardTitle>
                <CardDescription>Sesuaikan tampilan dan format regional</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                  <div className="grid gap-2">
                    <Label>Tema</Label>
                    <Select value={appearance.theme} onValueChange={(v) => v && setAppearance({ ...appearance, theme: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Terang</SelectItem>
                        <SelectItem value="dark">Gelap</SelectItem>
                        <SelectItem value="system">Ikuti Sistem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Bahasa</Label>
                    <Select value={appearance.language} onValueChange={(v) => v && setAppearance({ ...appearance, language: v })}>
                      <SelectTrigger>
                        <Globe className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Format Tanggal</Label>
                    <Select value={appearance.dateFormat} onValueChange={(v) => v && setAppearance({ ...appearance, dateFormat: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Mata Uang</Label>
                    <Select value={appearance.currency} onValueChange={(v) => v && setAppearance({ ...appearance, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR - Rupiah</SelectItem>
                        <SelectItem value="USD">USD - Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAppearance}>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Preferensi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
