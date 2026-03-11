"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout as Layout } from "@/components/layout/dashboard-layout";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/pos": "Kasir (POS)",
  "/dashboard/orders": "Pesanan",
  "/dashboard/services": "Layanan",
  "/dashboard/customers": "Pelanggan",
  "/dashboard/members": "Paket Member",
  "/dashboard/reports": "Laporan",
  "/dashboard/staff": "Manajemen Karyawan",
  "/dashboard/branches": "Cabang",
  "/dashboard/billing": "Langganan",
  "/dashboard/settings": "Pengaturan",
};

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || "Dashboard";

  return <Layout title={title}>{children}</Layout>;
}
