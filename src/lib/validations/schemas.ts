import { z } from "zod";

// ============================================
// AUTH VALIDATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(8, "Password minimal 8 karakter"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Nama wajib diisi")
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  phone: z
    .string()
    .min(1, "Nomor HP wajib diisi")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor HP tidak valid"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(8, "Password minimal 8 karakter")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password harus mengandung huruf besar, huruf kecil, dan angka"
    ),
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// ORGANIZATION & BRANCH SCHEMAS
// ============================================

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Nama laundry wajib diisi")
    .min(3, "Nama laundry minimal 3 karakter")
    .max(100, "Nama laundry maksimal 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .min(3, "Slug minimal 3 karakter")
    .max(50, "Slug maksimal 50 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan strip"),
});

export const createBranchSchema = z.object({
  name: z
    .string()
    .min(1, "Nama cabang wajib diisi")
    .min(3, "Nama cabang minimal 3 karakter")
    .max(100, "Nama cabang maksimal 100 karakter"),
  address: z
    .string()
    .min(1, "Alamat wajib diisi")
    .min(10, "Alamat minimal 10 karakter"),
  phone: z
    .string()
    .min(1, "Nomor telepon wajib diisi")
    .regex(/^(\+62|62|0)[0-9]{8,12}$/, "Format nomor telepon tidak valid"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// ============================================
// STAFF INVITATION SCHEMA
// ============================================

export const userRoles = ["owner", "manager", "cashier", "courier"] as const;

export const inviteStaffSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  branchPermissions: z
    .array(
      z.object({
        branchId: z.string().min(1, "Cabang wajib dipilih"),
        roles: z
          .array(z.enum(userRoles))
          .min(1, "Minimal pilih satu peran"),
      })
    )
    .min(1, "Minimal satu cabang harus dipilih"),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

// ============================================
// LAUNDRY SERVICE SCHEMA
// ============================================

export const serviceUnits = ["kg", "pcs", "meter", "pasang"] as const;
export const serviceCategories = ["cuci", "setrika", "cuci_setrika", "dry_clean", "express", "khusus"] as const;

export const createServiceSchema = z.object({
  name: z
    .string()
    .min(1, "Nama layanan wajib diisi")
    .min(3, "Nama layanan minimal 3 karakter"),
  category: z.enum(serviceCategories, {
    message: "Kategori tidak valid",
  }),
  unit: z.enum(serviceUnits, {
    message: "Satuan tidak valid",
  }),
  price: z
    .number()
    .min(1, "Harga wajib diisi")
    .min(1000, "Harga minimal Rp 1.000"),
  estimatedDays: z
    .number()
    .min(1, "Estimasi hari minimal 1")
    .max(14, "Estimasi hari maksimal 14"),
  description: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

// ============================================
// ORDER & TRANSACTION SCHEMAS
// ============================================

export const orderStatuses = [
  "pending",
  "processing",
  "washing",
  "drying",
  "ironing",
  "ready",
  "delivered",
  "completed",
  "cancelled",
] as const;

export const paymentMethods = ["cash", "qris", "transfer", "ewallet"] as const;

export const createOrderItemSchema = z.object({
  serviceId: z.string().min(1, "Layanan wajib dipilih"),
  quantity: z
    .number()
    .min(0.1, "Jumlah minimal 0.1")
    .max(1000, "Jumlah maksimal 1000"),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .min(1, "Nama pelanggan wajib diisi")
    .min(2, "Nama pelanggan minimal 2 karakter"),
  customerPhone: z
    .string()
    .min(1, "Nomor HP pelanggan wajib diisi")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor HP tidak valid"),
  items: z
    .array(createOrderItemSchema)
    .min(1, "Minimal satu item harus ditambahkan"),
  discount: z.number().min(0, "Diskon tidak boleh negatif").optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountReason: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID wajib diisi"),
  status: z.enum(orderStatuses),
  notes: z.string().optional(),
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ============================================
// CUSTOMER SCHEMA
// ============================================

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, "Nama pelanggan wajib diisi")
    .min(2, "Nama pelanggan minimal 2 karakter"),
  phone: z
    .string()
    .min(1, "Nomor HP wajib diisi")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor HP tidak valid"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  address: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ============================================
// SEARCH & FILTER SCHEMAS
// ============================================

export const searchOrdersSchema = z.object({
  query: z.string().optional(),
  status: z.enum(orderStatuses).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export type SearchOrdersInput = z.infer<typeof searchOrdersSchema>;
