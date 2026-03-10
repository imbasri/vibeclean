"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Shirt, Check } from "lucide-react";
import { gooeyToast } from "goey-toast";
import { motion } from "framer-motion";

import { signUp } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/lib/validations/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(password || "");
  const strengthLabels = ["Sangat Lemah", "Lemah", "Cukup", "Kuat", "Sangat Kuat"];
  const strengthColors = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-primary", "bg-green-500"];

  const onSubmit = async (data: RegisterInput) => {
    const result = await signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
      // Note: phone is stored in user metadata, we'll handle this via a custom field or separate update
    });

    if (result.error) {
      gooeyToast.error("Pendaftaran gagal", {
        description: result.error.message || "Terjadi kesalahan saat mendaftar",
      });
      return;
    }
    
    gooeyToast.success("Pendaftaran berhasil!", {
      description: "Silakan cek email untuk verifikasi akun.",
    });
    
    setIsSuccess(true);
    
    // Redirect after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-background to-primary/5 dark:from-background dark:via-background dark:to-muted px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
        >
          <Card className="w-full max-w-md text-center border-0 shadow-xl">
            <CardContent className="pt-8 pb-8">
              <motion.div 
                className="flex justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                  <Check className="w-10 h-10 text-white" strokeWidth={3} />
                </div>
              </motion.div>
              <motion.h2 
                className="text-2xl font-bold mb-2 text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Pendaftaran Berhasil!
              </motion.h2>
              <motion.p 
                className="text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Akun Anda telah dibuat. Mengalihkan ke halaman login...
              </motion.p>
              <motion.div
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 dark:from-background dark:via-background dark:to-muted px-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-accent/20 dark:bg-accent/10 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/10 dark:bg-primary/5 rounded-full opacity-40 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <motion.div 
              className="flex justify-center mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/25">
                  <Shirt className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  VibeClean
                </span>
              </div>
            </motion.div>
            <CardTitle className="text-2xl">Daftar Akun Baru</CardTitle>
            <CardDescription>
              Mulai kelola laundry Anda dengan lebih efisien
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  {...register("name")}
                  className={`h-11 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.name && (
                  <motion.p 
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errors.name.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  {...register("email")}
                  className={`h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.email && (
                  <motion.p 
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label htmlFor="phone">Nomor HP</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  {...register("phone")}
                  className={`h-11 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.phone && (
                  <motion.p 
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errors.phone.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    {...register("password")}
                    className={`h-11 pr-12 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-muted"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <motion.p 
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errors.password.message}
                  </motion.p>
                )}
                
                {/* Password strength indicator */}
                {password && (
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : "bg-muted"
                          }`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: i * 0.05 }}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      passwordStrength <= 2 ? "text-destructive" : 
                      passwordStrength === 3 ? "text-yellow-600" : 
                      "text-green-600"
                    }`}>
                      Kekuatan: {strengthLabels[passwordStrength - 1] || "Sangat Lemah"}
                    </p>
                  </motion.div>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    {...register("confirmPassword")}
                    className={`h-11 pr-12 ${errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-muted"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <motion.p 
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errors.confirmPassword.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                <input
                  type="checkbox"
                  id="terms"
                  className="rounded border-input text-primary focus:ring-primary mt-0.5"
                  required
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                  Saya menyetujui{" "}
                  <Link href="#" className="text-primary hover:text-primary/80 font-medium hover:underline">
                    Syarat & Ketentuan
                  </Link>{" "}
                  dan{" "}
                  <Link href="#" className="text-primary hover:text-primary/80 font-medium hover:underline">
                    Kebijakan Privasi
                  </Link>
                </label>
              </motion.div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <motion.div
                className="w-full"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mendaftar...
                    </>
                  ) : (
                    "Daftar Sekarang"
                  )}
                </Button>
              </motion.div>

              <p className="text-sm text-center text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors">
                  Masuk di sini
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <motion.p 
          className="text-center text-sm text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          &copy; {new Date().getFullYear()} VibeClean. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}
