"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { needsOnboarding, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Don't redirect during loading
    if (isLoading) return;

    // Don't redirect if already on onboarding page
    if (pathname === "/dashboard/onboarding") return;

    // Redirect to onboarding if needed
    if (needsOnboarding && isAuthenticated) {
      router.push("/dashboard/onboarding");
    }
  }, [needsOnboarding, isAuthenticated, isLoading, router, pathname]);

  return <>{children}</>;
}

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <OnboardingCheck>{children}</OnboardingCheck>
    </AuthProvider>
  );
}
