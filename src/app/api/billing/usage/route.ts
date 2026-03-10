import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizations,
  organizationMembers,
  branchPermissions,
  branches,
  orders,
  subscriptions,
} from "@/lib/db";
import { eq, and, inArray, sql, gte } from "drizzle-orm";

// ============================================
// CONFIGURATION
// ============================================

// Plan limits sesuai PRD
const planLimits = {
  starter: {
    branches: 1,
    staffPerBranch: 3,
    ordersPerMonth: 100, // GRATIS = 100 transaksi/bulan
  },
  pro: {
    branches: 5,
    staffPerBranch: 10,
    ordersPerMonth: Infinity, // Unlimited
  },
  enterprise: {
    branches: Infinity,
    staffPerBranch: Infinity,
    ordersPerMonth: Infinity,
  },
} as const;

// ============================================
// HELPERS
// ============================================

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

async function getUserOrganization(userId: string) {
  const membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  if (!membership[0]?.organizationId) {
    return null;
  }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership[0].organizationId));

  return organization;
}

// ============================================
// GET /api/billing/usage - Get usage statistics
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await getUserOrganization(session.user.id);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const plan = organization.plan as keyof typeof planLimits;
    const limits = planLimits[plan] || planLimits.starter;

    // Get branch count
    const [branchCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(branches)
      .where(eq(branches.organizationId, organization.id));

    // Get staff count
    const [staffCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${organizationMembers.userId})::int`,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organization.id));

    // Get orders count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const orgBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.organizationId, organization.id));

    const branchIds = orgBranches.map((b) => b.id);

    let ordersThisMonth = 0;
    if (branchIds.length > 0) {
      const [orderCount] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, startOfMonth)
          )
        );
      ordersThisMonth = orderCount?.count || 0;
    }

    // Get subscription for more accurate tracking
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id));

    // Use subscription's order count if available
    const actualOrderCount = subscription?.monthlyOrderCount || ordersThisMonth;

    // Calculate percentages
    const branchesUsed = branchCount?.count || 0;
    const staffUsed = staffCount?.count || 0;
    const branchLimit = limits.branches === Infinity ? "Unlimited" : limits.branches;
    const staffLimit = limits.staffPerBranch === Infinity
      ? "Unlimited"
      : limits.staffPerBranch * Math.max(1, branchesUsed);
    const ordersLimit = limits.ordersPerMonth === Infinity ? "Unlimited" : limits.ordersPerMonth;

    const usage = {
      branches: {
        used: branchesUsed,
        limit: branchLimit,
        percentage:
          limits.branches === Infinity
            ? 0
            : Math.round((branchesUsed / limits.branches) * 100),
        remaining:
          limits.branches === Infinity
            ? Infinity
            : Math.max(0, limits.branches - branchesUsed),
      },
      staff: {
        used: staffUsed,
        limit: staffLimit,
        percentage:
          limits.staffPerBranch === Infinity
            ? 0
            : Math.round(
                (staffUsed / (limits.staffPerBranch * Math.max(1, branchesUsed))) * 100
              ),
        remaining:
          limits.staffPerBranch === Infinity
            ? Infinity
            : Math.max(0, limits.staffPerBranch * Math.max(1, branchesUsed) - staffUsed),
      },
      orders: {
        used: actualOrderCount,
        limit: ordersLimit,
        percentage:
          limits.ordersPerMonth === Infinity
            ? 0
            : Math.round((actualOrderCount / limits.ordersPerMonth) * 100),
        remaining:
          limits.ordersPerMonth === Infinity
            ? Infinity
            : Math.max(0, limits.ordersPerMonth - actualOrderCount),
      },
    };

    // Warning flags
    const warnings = [];
    
    if (usage.branches.percentage >= 100) {
      warnings.push({
        type: "branches",
        message: "Anda telah mencapai batas cabang. Upgrade untuk menambah lebih banyak cabang.",
      });
    } else if (usage.branches.percentage >= 80) {
      warnings.push({
        type: "branches",
        message: `Penggunaan cabang mendekati batas (${usage.branches.remaining} tersisa).`,
      });
    }

    if (usage.orders.percentage >= 100) {
      warnings.push({
        type: "orders",
        message: "Anda telah mencapai batas transaksi bulan ini. Upgrade untuk transaksi unlimited.",
      });
    } else if (usage.orders.percentage >= 80) {
      warnings.push({
        type: "orders",
        message: `Kuota transaksi hampir habis (${usage.orders.remaining} tersisa bulan ini).`,
      });
    }

    // Can create order?
    const canCreateOrder = limits.ordersPerMonth === Infinity || actualOrderCount < limits.ordersPerMonth;
    const canCreateBranch = limits.branches === Infinity || branchesUsed < limits.branches;

    return NextResponse.json({
      plan: organization.plan,
      usage,
      warnings,
      limits: {
        canCreateOrder,
        canCreateBranch,
        isUnlimited: plan === "enterprise",
      },
      period: {
        start: startOfMonth.toISOString(),
        end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/billing/usage - Increment order count
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await getUserOrganization(session.user.id);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action } = body as { action: "increment_order" };

    if (action !== "increment_order") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Get or create subscription
    let [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (!subscription) {
      // Create subscription record
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          organizationId: organization.id,
          plan: organization.plan as "starter" | "pro" | "enterprise",
          status: organization.subscriptionStatus as "active" | "trial" | "expired" | "cancelled",
          price: "0",
          billingCycle: "monthly",
          monthlyOrderCount: 1,
          lastOrderCountReset: startOfMonth,
        })
        .returning();
      subscription = newSub;
    } else {
      // Check if we need to reset monthly count
      const lastReset = subscription.lastOrderCountReset || new Date(0);
      const shouldReset = lastReset < startOfMonth;

      if (shouldReset) {
        // Reset and increment
        await db
          .update(subscriptions)
          .set({
            monthlyOrderCount: 1,
            lastOrderCountReset: startOfMonth,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, subscription.id));
      } else {
        // Just increment
        await db
          .update(subscriptions)
          .set({
            monthlyOrderCount: subscription.monthlyOrderCount + 1,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, subscription.id));
      }
    }

    // Check limits
    const plan = organization.plan as keyof typeof planLimits;
    const limits = planLimits[plan] || planLimits.starter;
    const newCount = subscription ? subscription.monthlyOrderCount + 1 : 1;
    const limitReached = limits.ordersPerMonth !== Infinity && newCount > limits.ordersPerMonth;

    return NextResponse.json({
      success: true,
      currentCount: newCount,
      limit: limits.ordersPerMonth === Infinity ? "Unlimited" : limits.ordersPerMonth,
      limitReached,
      warning: limitReached
        ? "Anda telah mencapai batas transaksi. Upgrade untuk melanjutkan."
        : null,
    });
  } catch (error) {
    console.error("Error updating usage:", error);
    return NextResponse.json(
      { error: "Failed to update usage" },
      { status: 500 }
    );
  }
}
