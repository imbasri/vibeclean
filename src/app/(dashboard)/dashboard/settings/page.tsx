"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, type Variants, type Easing } from "framer-motion";
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
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
  ArrowRight,
  Clock,
  AlertTriangle,
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
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/components/common/permission-guard";
import { useProfile, useOrganization, usePassword } from "@/hooks/use-settings";
import { UploadDropzone } from "@/utils/uploadthing";

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

// Section Header Component
function SectionHeader({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// Form Field Component with validation
function FormField({ 
  label, 
  error, 
  children,
  helpText 
}: { 
  label: string; 
  error?: string;
  children: React.ReactNode;
  helpText?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {(error || helpText) && (
        <p className={`text-xs ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helpText}
        </p>
      )}
    </div>
  );
}

// Save Button with state
function SaveButton({ 
  onClick, 
  isLoading, 
  isDirty,
  label = "Simpan Perubahan"
}: { 
  onClick: () => void; 
  isLoading: boolean;
  isDirty?: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {isDirty && (
        <span className="text-sm text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" />
          Ada perubahan belum disimpan
        </span>
      )}
      <Button onClick={onClick} disabled={isLoading || (isDirty === false)}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>
    </div>
  );
}

// Notification Toggle Component
function NotificationToggle({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export default function SettingsPage() {
  // Refs for tracking unsaved changes
  const profileFormRef = useRef<HTMLFormElement>(null);
  const orgFormRef = useRef<HTMLFormElement>(null);
  
  // Track unsaved changes
  const [profileDirty, setProfileDirty] = useState(false);
  const [orgDirty, setOrgDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ [key: string]: Date }>({});
  
  // API hooks
  const {
    profile,
    isLoading: profileLoading,
    updateProfile,
    isUpdating: profileUpdating,
  } = useProfile();

  const {
    organization,
    isLoading: orgLoading,
    updateOrganization,
    isUpdating: orgUpdating,
  } = useOrganization();

  const { changePassword, isChanging: passwordChanging } = usePassword();

  // Profile form state with validation
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [profileErrors, setProfileErrors] = useState<{ name?: string; phone?: string }>({});

  // Organization form state with validation
  const [orgForm, setOrgForm] = useState({
    name: "",
    slug: "",
    logo: "",
  });
  const [orgErrors, setOrgErrors] = useState<{ name?: string; slug?: string }>({});

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
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

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

  // Track profile changes
  const handleProfileChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileDirty(true);
    
    // Clear error when user types
    if (profileErrors[field as keyof typeof profileErrors]) {
      setProfileErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate profile form
  const validateProfile = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!profileForm.name.trim()) {
      errors.name = "Nama wajib diisi";
    } else if (profileForm.name.trim().length < 2) {
      errors.name = "Nama minimal 2 karakter";
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Track org changes
  const handleOrgChange = (field: string, value: string) => {
    setOrgForm(prev => ({ ...prev, [field]: value }));
    setOrgDirty(true);
    
    // Clear error when user types
    if (orgErrors[field as keyof typeof orgErrors]) {
      setOrgErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate org form
  const validateOrg = () => {
    const errors: { name?: string; slug?: string } = {};
    if (!orgForm.name.trim()) {
      errors.name = "Nama bisnis wajib diisi";
    }
    if (!orgForm.slug.trim()) {
      errors.slug = "Slug URL wajib diisi";
    } else if (!/^[a-z0-9-]+$/.test(orgForm.slug)) {
      errors.slug = "Slug hanya boleh huruf kecil, angka, dan strip";
    }
    setOrgErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sync profile form with API data
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
      setProfileDirty(false);
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
      setOrgDirty(false);
    }
  }, [organization]);

  // Keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Trigger save based on active tab - handled by the form
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    
    const result = await updateProfile({
      name: profileForm.name,
      phone: profileForm.phone,
    });

    if (result.success) {
      setProfileDirty(false);
      setLastSaved(prev => ({ ...prev, profile: new Date() }));
      gooeyToast.success("Profil Disimpan", { description: "Perubahan profil berhasil disimpan" });
    } else {
      gooeyToast.error("Gagal Menyimpan", { description: result.error || "Terjadi kesalahan" });
    }
  };

  const handleSaveOrganization = async () => {
    if (!validateOrg()) return;
    
    const result = await updateOrganization({
      name: orgForm.name,
      slug: orgForm.slug,
      logo: orgForm.logo,
    });

    if (result.success) {
      setOrgDirty(false);
      setLastSaved(prev => ({ ...prev, organization: new Date() }));
      gooeyToast.success("Organisasi Disimpan", { description: "Perubahan organisasi berhasil disimpan" });
    } else {
      gooeyToast.error("Gagal Menyimpan", { description: result.error || "Terjadi kesalahan" });
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("vibeclean_notifications", JSON.stringify(notifications));
    setLastSaved(prev => ({ ...prev, notifications: new Date() }));
    gooeyToast.success("Notifikasi Disimpan", { description: "Preferensi notifikasi berhasil disimpan" });
  };

  const handleChangePassword = async () => {
    const errors: { [key: string]: string } = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Password saat ini wajib diisi";
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = "Password baru wajib diisi";
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = "Password minimal 6 karakter";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Password baru dan konfirmasi harus sama";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    
    const result = await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    if (result.success) {
      gooeyToast.success("Password Diubah", { description: "Password berhasil diperbarui" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      gooeyToast.error("Gagal Mengubah Password", { description: result.error || "Terjadi kesalahan" });
    }
  };

  const handleSaveAppearance = () => {
    localStorage.setItem("vibeclean_appearance", JSON.stringify(appearance));
    setLastSaved(prev => ({ ...prev, appearance: new Date() }));
    gooeyToast.success("Tampilan Disimpan", { description: "Preferensi tampilan berhasil disimpan" });
  };

  // Format last saved time
  const formatLastSaved = (key: string) => {
    const time = lastSaved[key];
    if (!time) return null;
    const diff = Date.now() - time.getTime();
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    return time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500">Kelola profil, organisasi, dan preferensi Anda</p>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Profil</span>
            </TabsTrigger>
            <TabsTrigger 
              value="organization" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Organisasi</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Notifikasi</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Keamanan</span>
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Tampilan</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Profil Pengguna</CardTitle>
                    <CardDescription>Informasi akun pribadi Anda</CardDescription>
                  </div>
                  {lastSaved.profile && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Tersimpan {formatLastSaved('profile')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    {/* Avatar Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-gray-700 shadow-sm">
                        <AvatarImage 
                          src={profile?.image ? `${profile.image}?t=${new Date().getTime()}` : "/avatars/user.jpg"} 
                          alt="Profile"
                        />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {profileForm.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <UploadDropzone
                            endpoint="profileImage"
                            onClientUploadComplete={(res) => {
                              const imageUrl = res?.[0]?.url;
                              if (imageUrl) {
                                // Update profile with new image
                                updateProfile({ image: imageUrl }).then(() => {
                                  // Force refresh by updating form state too
                                  setProfileForm(prev => ({ ...prev, image: imageUrl }));
                                  gooeyToast.success("Foto Diubah", { description: "Foto profil berhasil diperbarui" });
                                });
                              }
                            }}
                            onUploadError={(error: Error) => {
                              gooeyToast.error("Gagal Upload", { description: error.message || "Terjadi kesalahan" });
                            }}
                            className="ut-button:bg-primary ut-button:text-white ut-button:hover:bg-primary/90 ut-label:text-muted-foreground ut-allowed-content:text-muted-foreground/70"
                          />
                        </div>
                        <p className="text-xs text-gray-500">JPG, PNG, WebP, GIF maksimal 512KB</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField 
                        label="Nama Lengkap" 
                        error={profileErrors.name}
                        helpText="Nama yang akan ditampilkan di sistem"
                      >
                        <Input
                          value={profileForm.name}
                          onChange={(e) => handleProfileChange('name', e.target.value)}
                          placeholder="Masukkan nama lengkap"
                          className={profileErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                      </FormField>
                      
                      <FormField 
                        label="Email" 
                        helpText="Email tidak dapat diubah"
                      >
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            className="pl-10 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                            value={profileForm.email}
                            disabled
                          />
                        </div>
                      </FormField>
                      
                      <FormField 
                        label="Nomor Telepon" 
                        error={profileErrors.phone}
                        helpText="Untuk通知 penting"
                      >
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="tel"
                            className="pl-10"
                            value={profileForm.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                            placeholder="0812 3456 7890"
                          />
                        </div>
                      </FormField>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <SaveButton 
                        onClick={handleSaveProfile} 
                        isLoading={profileUpdating}
                        isDirty={profileDirty}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <PermissionGuard allowedRoles={["owner"]} fallback={
              <Card className="border-none shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Akses Terbatas</h3>
                  <p className="text-gray-500 mt-1 text-sm max-w-sm mx-auto">Hanya owner yang dapat mengubah pengaturan organisasi</p>
                </CardContent>
              </Card>
            }>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Pengaturan Organisasi</CardTitle>
                      <CardDescription>Informasi bisnis laundry Anda</CardDescription>
                    </div>
                    {lastSaved.organization && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Tersimpan {formatLastSaved('organization')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  {orgLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <>
                      {/* Logo Section */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-md">
                          {organization?.logo ? (
                            <img 
                              src={organization.logo} 
                              alt="Logo" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            orgForm.name.substring(0, 2).toUpperCase() || "VC"
                          )}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <UploadDropzone
                              endpoint="organizationLogo"
                              onClientUploadComplete={(res) => {
                                const logoUrl = res?.[0]?.url;
                                if (logoUrl) {
                                  updateOrganization({ logo: logoUrl }).then(() => {
                                    gooeyToast.success("Logo Diubah", { description: "Logo organisasi berhasil diperbarui" });
                                  });
                                }
                              }}
                              onUploadError={(error: Error) => {
                                gooeyToast.error("Gagal Upload", { description: error.message || "Terjadi kesalahan" });
                              }}
                              className="ut-button:bg-primary ut-button:text-white ut-button:hover:bg-primary/90 ut-label:text-muted-foreground ut-allowed-content:text-muted-foreground/70"
                            />
                          </div>
                          <p className="text-xs text-gray-500">JPG, PNG, WebP, GIF maksimal 512KB</p>
                        </div>
                      </div>

                      {/* Form Fields */}
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField 
                          label="Nama Bisnis" 
                          error={orgErrors.name}
                          helpText="Nama laundry Anda yang akan ditampilkan ke pelanggan"
                        >
                          <Input
                            value={orgForm.name}
                            onChange={(e) => handleOrgChange('name', e.target.value)}
                            placeholder="Laundry Saya"
                            className={orgErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </FormField>
                        
                        <FormField 
                          label="Slug URL" 
                          error={orgErrors.slug}
                          helpText={`vibeclean.id/${orgForm.slug || 'your-business'}`}
                        >
                          <Input
                            value={orgForm.slug}
                            onChange={(e) => handleOrgChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="laundry-saya"
                            className={orgErrors.slug ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </FormField>
                      </div>

                      {organization && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">Paket Saat Ini</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 capitalize">{organization.plan}</p>
                          </div>
                          <Button variant="outline" size="sm" className="ml-auto">
                            Upgrade
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      )}

                      <div className="flex justify-end pt-4 border-t">
                        <SaveButton 
                          onClick={handleSaveOrganization} 
                          isLoading={orgUpdating}
                          isDirty={orgDirty}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </PermissionGuard>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Preferensi Notifikasi</CardTitle>
                    <CardDescription>Atur cara Anda menerima notifikasi</CardDescription>
                  </div>
                  {lastSaved.notifications && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Tersimpan {formatLastSaved('notifications')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <SectionHeader 
                    icon={Mail}
                    title="Notifikasi Email"
                    description="Penerimaan notifikasi melalui email"
                  />
                  <div className="grid gap-3 pl-3">
                    <NotificationToggle
                      title="Order Baru"
                      description="Notifikasi saat ada order masuk"
                      checked={notifications.emailNewOrder}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailNewOrder: checked })}
                    />
                    <NotificationToggle
                      title="Order Selesai"
                      description="Notifikasi saat order selesai"
                      checked={notifications.emailOrderComplete}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailOrderComplete: checked })}
                    />
                    <NotificationToggle
                      title="Laporan Mingguan"
                      description="Ringkasan performa setiap minggu"
                      checked={notifications.emailWeeklyReport}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailWeeklyReport: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* WhatsApp Notifications */}
                <div className="space-y-4">
                  <SectionHeader 
                    icon={MessageSquare}
                    title="Notifikasi WhatsApp"
                    description="Penerimaan notifikasi melalui WhatsApp"
                  />
                  <div className="grid gap-3 pl-3">
                    <NotificationToggle
                      title="Order Baru"
                      description="Notifikasi saat ada order masuk"
                      checked={notifications.whatsappNewOrder}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, whatsappNewOrder: checked })}
                    />
                    <NotificationToggle
                      title="Order Selesai"
                      description="Notifikasi ke pelanggan saat order selesai"
                      checked={notifications.whatsappOrderComplete}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, whatsappOrderComplete: checked })}
                    />
                    <NotificationToggle
                      title="Pengingat Pembayaran"
                      description="Reminder untuk order belum dibayar"
                      checked={notifications.whatsappPaymentReminder}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, whatsappPaymentReminder: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Push Notifications */}
                <div className="space-y-4">
                  <SectionHeader 
                    icon={Smartphone}
                    title="Push Notification"
                    description="Notifikasi langsung di browser"
                  />
                  <div className="pl-3">
                    <NotificationToggle
                      title="Aktifkan Push Notification"
                      description="Terima notifikasi langsung di browser"
                      checked={notifications.pushEnabled}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushEnabled: checked })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveNotifications} className="gap-2">
                    <Save className="h-4 w-4" />
                    Simpan Preferensi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div>
                  <CardTitle className="text-lg">Keamanan Akun</CardTitle>
                  <CardDescription>Kelola password dan keamanan akun</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {/* Change Password */}
                <div className="space-y-4">
                  <SectionHeader 
                    icon={Lock}
                    title="Ubah Password"
                    description="Perbarui password akun Anda secara berkala"
                  />
                  <div className="grid gap-4 max-w-lg pl-3">
                    <FormField 
                      label="Password Saat Ini" 
                      error={passwordErrors.currentPassword}
                    >
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => {
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                            setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
                          }}
                          placeholder="Masukkan password saat ini"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormField>
                    
                    <FormField 
                      label="Password Baru" 
                      error={passwordErrors.newPassword}
                      helpText="Minimal 6 karakter"
                    >
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => {
                            setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                            setPasswordErrors(prev => ({ ...prev, newPassword: '' }));
                          }}
                          placeholder="Masukkan password baru"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormField>
                    
                    <FormField 
                      label="Konfirmasi Password Baru" 
                      error={passwordErrors.confirmPassword}
                    >
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                          setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        placeholder="Konfirmasi password baru"
                      />
                    </FormField>
                    
                    <Button 
                      onClick={handleChangePassword} 
                      className="w-fit gap-2"
                      disabled={passwordChanging}
                    >
                      {passwordChanging ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      Ubah Password
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Two Factor Auth */}
                <div className="space-y-4">
                  <SectionHeader 
                    icon={Shield}
                    title="Autentikasi Dua Faktor (2FA)"
                    description="Tingkatkan keamanan akun dengan 2FA"
                  />
                  <div className="flex items-center justify-between p-4 border rounded-xl max-w-lg ml-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Status 2FA</p>
                        <p className="text-xs text-gray-500">Tingkatkan keamanan akun Anda</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Aktifkan</Button>
                  </div>
                </div>

                <Separator />

                {/* Active Sessions */}
                <div className="space-y-4">
                  <SectionHeader 
                    icon={Clock}
                    title="Sesi Aktif"
                    description="Perangkat yang sedang login"
                  />
                  <div className="space-y-3 pl-3">
                    <div className="flex items-center justify-between p-4 border rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Chrome - Windows</p>
                          <p className="text-xs text-gray-500">Sesi saat ini • Jakarta, ID</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600">Aktif</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Tampilan & Regional</CardTitle>
                    <CardDescription>Sesuaikan tampilan dan format regional</CardDescription>
                  </div>
                  {lastSaved.appearance && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Tersimpan {formatLastSaved('appearance')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <SectionHeader 
                  icon={Palette}
                  title="Pengaturan Tampilan"
                  description="Kustomisasi tampilan aplikasi"
                />
                
                <div className="grid gap-6 md:grid-cols-2 max-w-2xl pl-3">
                  <FormField 
                    label="Tema" 
                    helpText="Pilih tampilan yang nyaman untuk mata Anda"
                  >
                    <Select value={appearance.theme} onValueChange={(v) => v && setAppearance({ ...appearance, theme: v })}>
                      <SelectTrigger className="gap-2">
                        {appearance.theme === 'light' && <span>☀️</span>}
                        {appearance.theme === 'dark' && <span>🌙</span>}
                        {appearance.theme === 'system' && <span>💻</span>}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">☀️ Terang</SelectItem>
                        <SelectItem value="dark">🌙 Gelap</SelectItem>
                        <SelectItem value="system">💻 Ikuti Sistem</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  
                  <FormField 
                    label="Bahasa" 
                    helpText="Pilih bahasa antarmuka"
                  >
                    <Select value={appearance.language} onValueChange={(v) => v && setAppearance({ ...appearance, language: v })}>
                      <SelectTrigger className="gap-2">
                        <Globe className="h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">🇮🇩 Indonesia</SelectItem>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  
                  <FormField 
                    label="Format Tanggal" 
                    helpText="Format penulisan tanggal"
                  >
                    <Select value={appearance.dateFormat} onValueChange={(v) => v && setAppearance({ ...appearance, dateFormat: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  
                  <FormField 
                    label="Mata Uang" 
                    helpText="Mata uang untuk transaksi"
                  >
                    <Select value={appearance.currency} onValueChange={(v) => v && setAppearance({ ...appearance, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">🇮🇩 IDR - Rupiah</SelectItem>
                        <SelectItem value="USD">🇺🇸 USD - Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveAppearance} className="gap-2">
                    <Save className="h-4 w-4" />
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
