/**
 * Admin Utilities
 * 
 * Super admin is determined by email address stored in ADMIN_EMAILS env variable.
 * Format: comma-separated emails, e.g., "admin@vibeclean.id,super@vibeclean.id"
 */

// Get list of admin emails from environment
export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  return adminEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Check if an email is a super admin
export function isSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

// Plan limits configuration (shared)
export const PLAN_LIMITS = {
  starter: {
    ordersPerMonth: 100,
    branches: 1,
    staffPerBranch: 3,
  },
  pro: {
    ordersPerMonth: Infinity,
    branches: 5,
    staffPerBranch: 10,
  },
  enterprise: {
    ordersPerMonth: Infinity,
    branches: Infinity,
    staffPerBranch: Infinity,
  },
} as const;

// Plan pricing
export const PLAN_PRICING = {
  starter: {
    monthly: 0,
    yearly: 0,
    name: "Starter",
    description: "Gratis selamanya",
  },
  pro: {
    monthly: 149000,
    yearly: 1490000, // ~17% discount
    name: "Pro",
    description: "Untuk bisnis berkembang",
  },
  enterprise: {
    monthly: 499000,
    yearly: 4990000,
    name: "Enterprise",
    description: "Untuk bisnis besar",
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
