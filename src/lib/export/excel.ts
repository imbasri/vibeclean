/**
 * Export Utilities for Reports
 * 
 * Provides Excel and PDF export functionality
 * Uses xlsx library for Excel
 * Uses jspdf and jspdf-autotable for PDF
 */

import * as XLSX from "xlsx";

export interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export interface OrderExportData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  estimatedCompletionAt: string | null;
}

/**
 * Export data to Excel
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const maxWidths: number[] = [];
  const headers = Object.keys(data[0] || {});
  headers.forEach((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...data.map(row => String(row[header] || "").length)
    );
    maxWidths[index] = Math.min(maxLength + 2, 50);
  });
  
  worksheet["!cols"] = maxWidths.map(w => ({ wch: w }));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || "Data"
  );
  
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
  
  return buffer;
}

/**
 * Format orders for Excel export
 */
export function formatOrdersForExport(orders: OrderExportData[]): Record<string, any>[] {
  return orders.map((order) => ({
    "No. Order": order.orderNumber,
    "Pelanggan": order.customerName,
    "No. HP": order.customerPhone,
    "Status": translateStatus(order.status),
    "Pembayaran": translatePaymentStatus(order.paymentStatus),
    "Metode": translatePaymentMethod(order.paymentMethod),
    "Subtotal": order.subtotal,
    "Diskon": order.discount,
    "Total": order.total,
    "Tanggal": new Date(order.createdAt).toLocaleDateString("id-ID"),
    "Estimasi Selesai": order.estimatedCompletionAt
      ? new Date(order.estimatedCompletionAt).toLocaleDateString("id-ID")
      : "-",
  }));
}

/**
 * Translate status to Indonesian
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    pending: "Menunggu",
    processing: "Diproses",
    washing: "Dicuci",
    drying: "Dikeringkan",
    ironing: "Disetrika",
    ready: "Siap",
    delivered: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return translations[status] || status;
}

/**
 * Translate payment status to Indonesian
 */
function translatePaymentStatus(status: string): string {
  const translations: Record<string, string> = {
    unpaid: "Belum Bayar",
    partial: "Bayar Sebagian",
    paid: "Lunas",
    refunded: "Dikembalikan",
  };
  return translations[status] || status;
}

/**
 * Translate payment method to Indonesian
 */
function translatePaymentMethod(method: string | null): string {
  if (!method) return "-";
  const translations: Record<string, string> = {
    cash: "Tunai",
    qris: "QRIS",
    transfer: "Transfer",
    ewallet: "E-Wallet",
  };
  return translations[method] || method;
}

/**
 * Format currency for display
 */
export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDateIDR(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================
// CUSTOMERS EXPORT
// ============================================

export interface CustomerExportData {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export function formatCustomersForExport(customers: CustomerExportData[]): Record<string, any>[] {
  return customers.map((customer) => ({
    "Nama": customer.name,
    "No. HP": customer.phone,
    "Email": customer.email || "-",
    "Alamat": customer.address || "-",
    "Total Order": customer.totalOrders,
    "Total spent": formatCurrencyIDR(customer.totalSpent),
    "Terdaftar": new Date(customer.createdAt).toLocaleDateString("id-ID"),
  }));
}

// ============================================
// SERVICES EXPORT
// ============================================

export interface ServiceExportData {
  name: string;
  category: string;
  unit: string;
  price: number;
  estimatedDays: number;
  isActive: boolean;
  branchName: string;
}

export function formatServicesForExport(services: ServiceExportData[]): Record<string, any>[] {
  return services.map((service) => ({
    "Layanan": service.name,
    "Kategori": translateCategory(service.category),
    "Satuan": translateUnit(service.unit),
    "Harga": formatCurrencyIDR(service.price),
    "Estimasi (hari)": service.estimatedDays,
    "Status": service.isActive ? "Aktif" : "Nonaktif",
    "Cabang": service.branchName,
  }));
}

function translateCategory(category: string): string {
  const translations: Record<string, string> = {
    cuci: "Cuci",
    setrika: "Setrika",
    cuci_setrika: "Cuci & Setrika",
    dry_clean: "Dry Clean",
    express: "Express",
    khusus: "Khusus",
  };
  return translations[category] || category;
}

function translateUnit(unit: string): string {
  const translations: Record<string, string> = {
    kg: "Kg",
    pcs: "Pcs",
    meter: "Meter",
    pasang: "Pasang",
  };
  return translations[unit] || unit;
}

// ============================================
// STAFF EXPORT
// ============================================

export interface StaffExportData {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  branchName: string;
  isActive: boolean;
  createdAt: string;
}

export function formatStaffForExport(staff: StaffExportData[]): Record<string, any>[] {
  return staff.map((s) => ({
    "Nama": s.name,
    "Email": s.email,
    "No. HP": s.phone || "-",
    "Peran": translateRole(s.role),
    "Cabang": s.branchName,
    "Status": s.isActive ? "Aktif" : "Nonaktif",
    "Terdaftar": new Date(s.createdAt).toLocaleDateString("id-ID"),
  }));
}

function translateRole(role: string): string {
  const translations: Record<string, string> = {
    owner: "Owner",
    manager: "Manajer",
    cashier: "Kasir",
    courier: "Kurir",
  };
  return translations[role] || role;
}

// ============================================
// MEMBER PACKAGES EXPORT
// ============================================

export interface MemberPackageExportData {
  name: string;
  description: string | null;
  price: number;
  discountType: string;
  discountValue: number;
  maxWeightKg: number | null;
  freePickupDelivery: boolean;
  maxTransactionsPerMonth: number | null;
  isActive: boolean;
}

export function formatMemberPackagesForExport(packages: MemberPackageExportData[]): Record<string, any>[] {
  return packages.map((pkg) => ({
    "Nama Paket": pkg.name,
    "Deskripsi": pkg.description || "-",
    "Harga/Bulan": formatCurrencyIDR(pkg.price),
    "Jenis Diskon": pkg.discountType === "percentage" ? "Persen (%)" : "Fixed (Rp)",
    "Nilai Diskon": pkg.discountType === "percentage" 
      ? `${pkg.discountValue}%` 
      : formatCurrencyIDR(pkg.discountValue),
    "Max Berat (kg)": pkg.maxWeightKg || "Unlimited",
    "Gratis Pickup": pkg.freePickupDelivery ? "Ya" : "Tidak",
    "Max Transaksi/Bulan": pkg.maxTransactionsPerMonth || "Unlimited",
    "Status": pkg.isActive ? "Aktif" : "Nonaktif",
  }));
}

// ============================================
// MEMBER SUBSCRIPTIONS EXPORT
// ============================================

export interface MemberSubscriptionExportData {
  customerName: string;
  customerPhone: string;
  packageName: string;
  status: string;
  startDate: string;
  endDate: string;
  transactionsThisMonth: number;
}

export function formatMemberSubscriptionsForExport(subscriptions: MemberSubscriptionExportData[]): Record<string, any>[] {
  return subscriptions.map((sub) => ({
    "Pelanggan": sub.customerName,
    "No. HP": sub.customerPhone,
    "Paket": sub.packageName,
    "Status": translateMemberStatus(sub.status),
    "Mulai": new Date(sub.startDate).toLocaleDateString("id-ID"),
    "Berakhir": new Date(sub.endDate).toLocaleDateString("id-ID"),
    "Transaksi Bulan Ini": sub.transactionsThisMonth,
  }));
}

function translateMemberStatus(status: string): string {
  const translations: Record<string, string> = {
    active: "Aktif",
    expired: "Expired",
    cancelled: "Dibatalkan",
    paused: "Dijeda",
  };
  return translations[status] || status;
}

// ============================================
// COUPONS EXPORT
// ============================================

export interface CouponExportData {
  code: string;
  type: string;
  value: number;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
}

export function formatCouponsForExport(coupons: CouponExportData[]): Record<string, any>[] {
  return coupons.map((coupon) => ({
    "Kode": coupon.code,
    "Jenis": coupon.type === "percentage" ? "Persen (%)" : "Fixed (Rp)",
    "Nilai": coupon.type === "percentage" 
      ? `${coupon.value}%` 
      : formatCurrencyIDR(coupon.value),
    "Min Order": coupon.minOrder ? formatCurrencyIDR(coupon.minOrder) : "-",
    "Max Penggunaan": coupon.maxUses || "Unlimited",
    "Sudah Digunakan": coupon.usedCount,
    "Valid Dari": new Date(coupon.validFrom).toLocaleDateString("id-ID"),
    "Valid Sampai": coupon.validUntil 
      ? new Date(coupon.validUntil).toLocaleDateString("id-ID") 
      : "Selalu",
    "Status": coupon.isActive ? "Aktif" : "Nonaktif",
  }));
}
