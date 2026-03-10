import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "starter",
  "pro",
  "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trial",
  "expired",
  "cancelled",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "manager",
  "cashier",
  "courier",
]);

export const serviceUnitEnum = pgEnum("service_unit", [
  "kg",
  "pcs",
  "meter",
  "pasang",
]);

export const serviceCategoryEnum = pgEnum("service_category", [
  "cuci",
  "setrika",
  "cuci_setrika",
  "dry_clean",
  "express",
  "khusus",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "washing",
  "drying",
  "ironing",
  "ready",
  "delivered",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partial",
  "paid",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "qris",
  "transfer",
  "ewallet",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

export const billingCycleEnum = pgEnum("billing_cycle", [
  "monthly",
  "yearly",
]);

export const subscriptionInvoiceStatusEnum = pgEnum("subscription_invoice_status", [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);

// ============================================
// ORGANIZATIONS (TENANTS)
// ============================================

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    plan: subscriptionPlanEnum("plan").notNull().default("starter"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("trial"),
    trialEndsAt: timestamp("trial_ends_at"),
    ownerId: uuid("owner_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organizations_slug_idx").on(table.slug),
  ]
);

// ============================================
// USERS (Better Auth compatible)
// ============================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    phone: text("phone"),
    image: text("image"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

// ============================================
// BETTER AUTH: SESSIONS
// ============================================

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    uniqueIndex("sessions_token_idx").on(table.token),
  ]
);

// ============================================
// BETTER AUTH: ACCOUNTS (OAuth providers)
// ============================================

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"), // For email/password auth
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
  ]
);

// ============================================
// BETTER AUTH: VERIFICATIONS (email, password reset)
// ============================================

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
  ]
);

// ============================================
// BRANCHES
// ============================================

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("branches_organization_id_idx").on(table.organizationId),
  ]
);

// ============================================
// ORGANIZATION MEMBERS (User <-> Organization)
// ============================================

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by").references(() => users.id),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("org_members_user_org_idx").on(table.userId, table.organizationId),
    index("org_members_organization_id_idx").on(table.organizationId),
  ]
);

// ============================================
// BRANCH PERMISSIONS (Multi-role per branch)
// ============================================

export const branchPermissions = pgTable(
  "branch_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => organizationMembers.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("branch_perm_member_branch_role_idx").on(
      table.memberId,
      table.branchId,
      table.role
    ),
    index("branch_perm_branch_id_idx").on(table.branchId),
  ]
);

// ============================================
// STAFF INVITATIONS
// ============================================

export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("staff_invitations_email_idx").on(table.email),
    index("staff_invitations_org_id_idx").on(table.organizationId),
  ]
);

// Invitation permissions (what roles will be assigned on accept)
export const invitationPermissions = pgTable(
  "invitation_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => staffInvitations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
  },
  (table) => [
    index("invitation_perm_invitation_id_idx").on(table.invitationId),
  ]
);

// ============================================
// LAUNDRY SERVICES
// ============================================

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: serviceCategoryEnum("category").notNull(),
    unit: serviceUnitEnum("unit").notNull(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    estimatedDays: integer("estimated_days").notNull().default(1),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("services_branch_id_idx").on(table.branchId),
    index("services_category_idx").on(table.category),
  ]
);

// ============================================
// CUSTOMERS
// ============================================

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    totalOrders: integer("total_orders").notNull().default(0),
    totalSpent: decimal("total_spent", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    memberSince: timestamp("member_since").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("customers_organization_id_idx").on(table.organizationId),
    index("customers_phone_idx").on(table.phone),
  ]
);

// ============================================
// ORDERS
// ============================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    discountType: text("discount_type"), // 'percentage' | 'fixed'
    discountReason: text("discount_reason"),
    couponCode: text("coupon_code"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("unpaid"),
    paymentMethod: paymentMethodEnum("payment_method"),
    paidAmount: decimal("paid_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    // Transaction Fee (VibeClean founder's revenue per transaction)
    transactionFee: decimal("transaction_fee", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    // Mayar Payment Integration Fields
    mayarPaymentId: text("mayar_payment_id"), // Mayar invoice/payment ID
    mayarTransactionId: text("mayar_transaction_id"), // Mayar transaction ID
    paymentUrl: text("payment_url"), // URL untuk pembayaran (invoice link)
    qrCodeUrl: text("qr_code_url"), // URL gambar QRIS
    paymentExpiredAt: timestamp("payment_expired_at"), // Kapan payment expired
    paidAt: timestamp("paid_at"), // Kapan dibayar
    notes: text("notes"),
    estimatedCompletionAt: timestamp("estimated_completion_at").notNull(),
    completedAt: timestamp("completed_at"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_branch_id_idx").on(table.branchId),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_mayar_payment_id_idx").on(table.mayarPaymentId),
  ]
);

// ============================================
// ORDER ITEMS
// ============================================

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    serviceName: text("service_name").notNull(), // Snapshot at order time
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: serviceUnitEnum("unit").notNull(),
    pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
  ]
);

// ============================================
// ORDER STATUS HISTORY
// ============================================

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.orderId),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  branches: many(branches),
  members: many(organizationMembers),
  customers: many(customers),
  invitations: many(staffInvitations),
  subscription: one(subscriptions),
  subscriptionInvoices: many(subscriptionInvoices),
}));

export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganizations: many(organizations),
  memberships: many(organizationMembers),
  createdOrders: many(orders),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [branches.organizationId],
    references: [organizations.id],
  }),
  services: many(services),
  orders: many(orders),
  permissions: many(branchPermissions),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    inviter: one(users, {
      fields: [organizationMembers.invitedBy],
      references: [users.id],
    }),
    branchPermissions: many(branchPermissions),
  })
);

export const branchPermissionsRelations = relations(branchPermissions, ({ one }) => ({
  member: one(organizationMembers, {
    fields: [branchPermissions.memberId],
    references: [organizationMembers.id],
  }),
  branch: one(branches, {
    fields: [branchPermissions.branchId],
    references: [branches.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  branch: one(branches, {
    fields: [services.branchId],
    references: [branches.id],
  }),
  orderItems: many(orderItems),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  branch: one(branches, {
    fields: [orders.branchId],
    references: [branches.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  service: one(services, {
    fields: [orderItems.serviceId],
    references: [services.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changedByUser: one(users, {
    fields: [orderStatusHistory.changedBy],
    references: [users.id],
  }),
}));

export const staffInvitationsRelations = relations(staffInvitations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [staffInvitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [staffInvitations.invitedBy],
    references: [users.id],
  }),
  permissions: many(invitationPermissions),
}));

export const invitationPermissionsRelations = relations(
  invitationPermissions,
  ({ one }) => ({
    invitation: one(staffInvitations, {
      fields: [invitationPermissions.invitationId],
      references: [staffInvitations.id],
    }),
    branch: one(branches, {
      fields: [invitationPermissions.branchId],
      references: [branches.id],
    }),
  })
);

// ============================================
// SUBSCRIPTIONS (Billing & Subscription Tracking)
// ============================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" })
      .unique(),
    plan: subscriptionPlanEnum("plan").notNull().default("starter"),
    status: subscriptionStatusEnum("status").notNull().default("trial"),
    billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
    price: decimal("price", { precision: 15, scale: 2 }).notNull().default("0"),
    // Mayar integration
    mayarCustomerId: text("mayar_customer_id"),
    mayarSubscriptionId: text("mayar_subscription_id"),
    // Dates
    trialStartsAt: timestamp("trial_starts_at"),
    trialEndsAt: timestamp("trial_ends_at"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelledAt: timestamp("cancelled_at"),
    // Usage tracking
    monthlyOrderCount: integer("monthly_order_count").notNull().default(0),
    lastOrderCountReset: timestamp("last_order_count_reset").defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_organization_id_idx").on(table.organizationId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_mayar_subscription_id_idx").on(table.mayarSubscriptionId),
  ]
);

// ============================================
// SUBSCRIPTION INVOICES (Payment History)
// ============================================

export const subscriptionInvoices = pgTable(
  "subscription_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull().unique(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    status: subscriptionInvoiceStatusEnum("status").notNull().default("pending"),
    plan: subscriptionPlanEnum("plan").notNull(),
    billingCycle: billingCycleEnum("billing_cycle").notNull(),
    // Mayar integration
    mayarPaymentId: text("mayar_payment_id"),
    mayarTransactionId: text("mayar_transaction_id"),
    paymentUrl: text("payment_url"),
    qrCodeUrl: text("qr_code_url"),
    // Dates
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("subscription_invoices_subscription_id_idx").on(table.subscriptionId),
    index("subscription_invoices_organization_id_idx").on(table.organizationId),
    index("subscription_invoices_status_idx").on(table.status),
    index("subscription_invoices_mayar_payment_id_idx").on(table.mayarPaymentId),
    uniqueIndex("subscription_invoices_invoice_number_idx").on(table.invoiceNumber),
  ]
);

// ============================================
// SUBSCRIPTION RELATIONS
// ============================================

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  invoices: many(subscriptionInvoices),
}));

export const subscriptionInvoicesRelations = relations(subscriptionInvoices, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionInvoices.subscriptionId],
    references: [subscriptions.id],
  }),
  organization: one(organizations, {
    fields: [subscriptionInvoices.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================
// WITHDRAWAL STATUS ENUM
// ============================================

const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "processing",
  "completed",
  "rejected",
  "cancelled",
]);

// ============================================
// WITHDRAWALS (Settlement Requests)
// ============================================

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    fee: decimal("fee", { precision: 15, scale: 2 }).notNull().default("0"),
    netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
    status: withdrawalStatusEnum("status").notNull().default("pending"),
    // Bank details
    bankName: text("bank_name").notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    bankAccountName: text("bank_account_name").notNull(),
    // Mayar integration (if using Mayar for disbursement)
    mayarWithdrawalId: text("mayar_withdrawal_id"),
    mayarWithdrawalStatus: text("mayar_withdrawal_status"),
    // Notes
    notes: text("notes"),
    rejectedReason: text("rejected_reason"),
    // Timestamps
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("withdrawals_organization_id_idx").on(table.organizationId),
    index("withdrawals_status_idx").on(table.status),
  ]
);

// ============================================
// WITHDRAWAL RELATIONS
// ============================================

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  organization: one(organizations, {
    fields: [withdrawals.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================
// COUPON TYPE ENUM
// ============================================

const couponTypeEnum = pgEnum("coupon_type", [
  "percentage",  // Percentage discount
  "fixed",       // Fixed amount discount
]);

const couponScopeEnum = pgEnum("coupon_scope", [
  "all",         // All services
  "category",    // Specific category
  "service",     // Specific service
]);

// ============================================
// COUPONS
// ============================================

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    description: text("description"),
    type: couponTypeEnum("type").notNull(),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Percentage or fixed amount
    scope: couponScopeEnum("scope").notNull().default("all"),
    // Scope specific (for category or service specific)
    category: text("category"), // Service category
    serviceId: uuid("service_id"), // Specific service ID
    // Limits
    minOrderAmount: decimal("min_order_amount", { precision: 15, scale: 2 }),
    maxDiscount: decimal("max_discount", { precision: 15, scale: 2 }), // For percentage coupons
    usageLimit: integer("usage_limit"), // Total uses allowed
    usageCount: integer("usage_count").notNull().default(0),
    perUserLimit: integer("per_user_limit").default(1),
    // Date limits
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    // Status
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("coupons_organization_id_idx").on(table.organizationId),
    index("coupons_code_idx").on(table.code),
  ]
);

// ============================================
// COUPON USAGE (Redemption tracking)
// ============================================

export const couponUsages = pgTable(
  "coupon_usages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // Customer user ID (if logged in)
    customerPhone: text("customer_phone").notNull(),
    discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("coupon_usages_coupon_id_idx").on(table.couponId),
    index("coupon_usages_order_id_idx").on(table.orderId),
  ]
);

// ============================================
// MEMBERSHIP TIERS
// ============================================

const membershipTierEnum = pgEnum("membership_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
]);

export const membershipTiers = pgTable(
  "membership_tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Bronze, Silver, Gold, Platinum
    tier: membershipTierEnum("tier").notNull().unique(),
    minSpending: decimal("min_spending", { precision: 15, scale: 2 }).notNull().default("0"),
    discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
    pointMultiplier: decimal("point_multiplier", { precision: 5, scale: 2 }).notNull().default("1"), // 1x, 2x, etc.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("membership_tiers_organization_id_idx").on(table.organizationId),
    index("membership_tiers_tier_idx").on(table.tier),
  ]
);

// ============================================
// CUSTOMER MEMBERSHIP
// ============================================

export const customerMemberships = pgTable(
  "customer_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => membershipTiers.id, { onDelete: "cascade" }),
    points: decimal("points", { precision: 15, scale: 2 }).notNull().default("0"),
    totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).notNull().default("0"),
    totalOrders: integer("total_orders").notNull().default(0),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end"), // For tier expiration
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("customer_memberships_customer_id_idx").on(table.customerId),
    index("customer_memberships_tier_id_idx").on(table.tierId),
  ]
);

// ============================================
// COUPON RELATIONS
// ============================================

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [coupons.organizationId],
    references: [organizations.id],
  }),
  usages: many(couponUsages),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsages.couponId],
    references: [coupons.id],
  }),
  order: one(orders, {
    fields: [couponUsages.orderId],
    references: [orders.id],
  }),
}));

// ============================================
// MEMBERSHIP RELATIONS
// ============================================

export const membershipTiersRelations = relations(membershipTiers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [membershipTiers.organizationId],
    references: [organizations.id],
  }),
  memberships: many(customerMemberships),
}));

export const customerMembershipsRelations = relations(customerMemberships, ({ one }) => ({
  customer: one(customers, {
    fields: [customerMemberships.customerId],
    references: [customers.id],
  }),
  tier: one(membershipTiers, {
    fields: [customerMemberships.tierId],
    references: [membershipTiers.id],
  }),
}));

// ============================================
// TRANSACTION FEE TYPE ENUM
// ============================================

const transactionFeeTypeEnum = pgEnum("transaction_fee_type", [
  "fixed",       // Fixed amount per transaction
  "percentage",  // Percentage of transaction amount
]);

// ============================================
// PLATFORM TRANSACTION FEE SETTINGS
// ============================================

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("platform_settings_key_idx").on(table.key),
  ]
);

// ============================================
// PLATFORM SETTINGS RELATIONS
// ============================================

export const platformSettingsRelations = relations(platformSettings, ({ one }) => ({}));
