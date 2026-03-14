"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Building2, Store, MapPin, Phone, Loader2, CheckCircle } from "lucide-react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

const onboardingSchema = z.object({
  organizationName: z.string().min(2, "Nama laundry minimal 2 karakter"),
  branchName: z.string().min(2, "Nama cabang minimal 2 karakter"),
  branchAddress: z.string().min(5, "Alamat lengkap wajib diisi"),
  branchPhone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Nomor HP tidak valid"),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: data.organizationName,
          branchName: data.branchName,
          branchAddress: data.branchAddress,
          branchPhone: data.branchPhone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat organisasi");
      }

      // Refresh user data
      await refreshUser();

      gooeyToast.success("Selamat!", {
        description: "Organisasi berhasil dibuat. Mengalihkan ke dashboard...",
      });

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      gooeyToast.error("Gagal", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl" />
              <img
                src="/logo_vibeclean.png"
                alt="VibeClean"
                className="relative w-full h-full object-contain"
              />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Selamat Datang di VibeClean!</h1>
          <p className="text-muted-foreground">
            Mari setup laundry Anda untuk memulai
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step >= 1 ? <CheckCircle className="w-5 h-5" /> : "1"}
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step >= 2 ? <CheckCircle className="w-5 h-5" /> : "2"}
            </div>
          </div>
        </div>

        {/* Step 1: Organization Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informasi Laundry
              </CardTitle>
              <CardDescription>
                Ceritakan tentang bisnis laundry Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Nama Laundry</Label>
                <Input
                  id="organizationName"
                  placeholder="Contoh: VibeClean Laundry Sudirman"
                  {...register("organizationName")}
                />
                {errors.organizationName && (
                  <p className="text-sm text-red-500">{errors.organizationName.message}</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={async () => {
                  const isValid = await trigger("organizationName");
                  if (isValid) setStep(2);
                }}
              >
                Lanjut
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Branch Info */}
        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Informasi Cabang
                </CardTitle>
                <CardDescription>
                  Setup cabang pertama Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branchName">Nama Cabang</Label>
                  <Input
                    id="branchName"
                    placeholder="Contoh: Cabang Sudirman"
                    {...register("branchName")}
                  />
                  {errors.branchName && (
                    <p className="text-sm text-red-500">{errors.branchName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchAddress">Alamat Lengkap</Label>
                  <Input
                    id="branchAddress"
                    placeholder="Jl. Sudirman No. 123, Jakarta"
                    {...register("branchAddress")}
                  />
                  {errors.branchAddress && (
                    <p className="text-sm text-red-500">{errors.branchAddress.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchPhone">Nomor WhatsApp</Label>
                  <Input
                    id="branchPhone"
                    placeholder="081234567890"
                    {...register("branchPhone")}
                  />
                  {errors.branchPhone && (
                    <p className="text-sm text-red-500">{errors.branchPhone.message}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mulai
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-card border">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Multi-Cabang</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">POS Otomatis</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Tracking Order</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
