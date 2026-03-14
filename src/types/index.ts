// VibeClean Type Definitions
// Multi-Tenant SaaS Laundry Management System

// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export type UserRole = "owner" | "manager" | "cashier" | "courier";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchPermission {
  branchId: string;
  branchName: string;
  roles: UserRole[];
}

export interface AuthUser extends User {
  organizationId: string;
  organizationName: string;
  permissions: BranchPermission[];
  activeBranchId: string | null;
  activeRoles: UserRole[];
}

// ============================================
// ORGANIZATION & BRANCH TYPES (MULTI-TENANT)
// ============================================

export type SubscriptionPlan = "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  qrColorDark?: string;
  qrColorLight?: string;
  qrLogoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STAFF & MEMBER TYPES
// ============================================

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  user: User;
  branchPermissions: BranchPermission[];
  invitedBy: string;
  joinedAt: Date;
}

export interface StaffInvitation {
  id: string;
  email: string;
  organizationId: string;
  branchPermissions: BranchPermission[];
  invitedBy: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "expired";
}

// ============================================
// LAUNDRY SERVICE TYPES
// ============================================

export type ServiceUnit = "kg" | "pcs" | "meter" | "pasang";
export type ServiceCategory = "cuci" | "setrika" | "cuci_setrika" | "dry_clean" | "express" | "khusus";

export interface LaundryService {
  id: string;
  branchId: string;
  name: string;
  category: ServiceCategory;
  unit: ServiceUnit;
  price: number;
  estimatedDays: number;
  isActive: boolean;
  description?: string;
}

// ============================================
// ORDER & TRANSACTION TYPES
// ============================================

export type OrderStatus = 
  | "pending"        // Menunggu diproses
  | "processing"     // Sedang dicuci
  | "washing"        // Proses cuci
  | "drying"         // Proses pengeringan
  | "ironing"        // Proses setrika
  | "ready"          // Siap diambil
  | "delivered"      // Sudah diantar
  | "completed"      // Selesai
  | "cancelled";     // Dibatalkan

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentMethod = "cash" | "qris" | "transfer" | "ewallet";

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unit: ServiceUnit;
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType?: "percentage" | "fixed";
  discountReason?: string;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAmount: number;
  // Mayar Payment Integration Fields
  mayarPaymentId?: string;
  mayarTransactionId?: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  paymentExpiredAt?: Date;
  paidAt?: Date;
  notes?: string;
  estimatedCompletionAt: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CUSTOMER TYPES (LOYALTY PROGRAM)
// ============================================

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  memberSince: Date;
}

// ============================================
// ANALYTICS & REPORTING TYPES
// ============================================

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  newCustomers: number;
}

export interface BranchStats extends DashboardStats {
  branchId: string;
  branchName: string;
}

// ============================================
// RE-EXPORT MAYAR TYPES
// ============================================

export * from "./mayar";
