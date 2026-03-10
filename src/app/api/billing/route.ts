import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizations,
  branches,
  orders,
  organizationMembers,
  branchPermissions,
  subscriptions,
  subscriptionInvoices,
} from "@/lib/db";
import { eq, and, inArray, sql, gte, desc } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to check if user is owner
async function isOwner(userId: string): Promise<boolean> {
  const permissions = await db
    .select({
      role: branchPermissions.role,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(eq(organizationMembers.userId, userId));

  return permissions.some((p) => p.role === "owner");
}

// Plan limits configuration - Updated sesuai PRD
const planLimits = {
  starter: {
    branches: 1,
    staffPerBranch: 3,
    ordersPerMonth: 100, // Updated: 100 order/bulan untuk Starter (GRATIS)
  },
  pro: {
    branches: 5,
    staffPerBranch: 10,
    ordersPerMonth: Infinity, // Unlimited untuk Pro
  },
  enterprise: {
    branches: Infinity,
    staffPerBranch: Infinity,
    ordersPerMonth: Infinity,
  },
} as const;

// Plan pricing - Updated sesuai PRD
const planPricing = {
  starter: 0,      // GRATIS
  pro: 149000,     // Rp 149.000/bulan
  enterprise: -1,  // Custom pricing
} as const;

// GET /api/billing - Get billing and subscription info
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return NextResponse.json(
        { error: "Only owners can access billing information" },
        { status: 403 }
      );
    }

    // Get user's organization
    const membership = await db
      .select({
        organizationId: organizationMembers.organizationId,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, session.user.id))
      .limit(1);

    if (!membership[0]?.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const organizationId = membership[0].organizationId;

    // Get organization details
    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        plan: organizations.plan,
        subscriptionStatus: organizations.subscriptionStatus,
        trialEndsAt: organizations.trialEndsAt,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get branch count
    const [branchCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(branches)
      .where(eq(branches.organizationId, organizationId));

    // Get staff count (unique members with permissions)
    const [staffCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${organizationMembers.userId})::int`,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));

    // Get orders count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all branch IDs for the organization
    const orgBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.organizationId, organizationId));

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

    // Calculate limits based on plan
    const plan = organization.plan as keyof typeof planLimits;
    const limits = planLimits[plan] || planLimits.starter;

    // Calculate next billing date (assume monthly billing from creation date)
    const createdAt = new Date(organization.createdAt);
    const now = new Date();
    let nextBillingDate = new Date(createdAt);
    
    // Advance to next month from creation
    while (nextBillingDate <= now) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // If in trial, use trial end date
    if (organization.subscriptionStatus === "trial" && organization.trialEndsAt) {
      nextBillingDate = new Date(organization.trialEndsAt);
    }

    const daysUntilRenewal = Math.max(
      0,
      Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Build usage stats
    const usage = {
      branches: {
        used: branchCount?.count || 0,
        limit: limits.branches === Infinity ? "Unlimited" : limits.branches,
        percentage: limits.branches === Infinity 
          ? 0 
          : Math.round(((branchCount?.count || 0) / limits.branches) * 100),
      },
      staff: {
        used: staffCount?.count || 0,
        limit: limits.staffPerBranch === Infinity 
          ? "Unlimited" 
          : limits.staffPerBranch * (branchCount?.count || 1),
        percentage: limits.staffPerBranch === Infinity
          ? 0
          : Math.round(
              ((staffCount?.count || 0) / (limits.staffPerBranch * Math.max(1, branchCount?.count || 1))) * 100
            ),
      },
      orders: {
        used: ordersThisMonth,
        limit: limits.ordersPerMonth === Infinity ? "Unlimited" : limits.ordersPerMonth,
        percentage: limits.ordersPerMonth === Infinity
          ? 0
          : Math.round((ordersThisMonth / limits.ordersPerMonth) * 100),
      },
    };

    // Get subscription record if exists
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));

    // Get invoices from database
    const dbInvoices = await db
      .select({
        id: subscriptionInvoices.invoiceNumber,
        date: subscriptionInvoices.createdAt,
        amount: subscriptionInvoices.amount,
        status: subscriptionInvoices.status,
        plan: subscriptionInvoices.plan,
      })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.organizationId, organizationId))
      .orderBy(desc(subscriptionInvoices.createdAt))
      .limit(10);

    const invoices = dbInvoices.map((inv) => ({
      id: inv.id,
      date: inv.date.toISOString(),
      amount: Number(inv.amount),
      status: inv.status as "paid" | "pending" | "failed",
      plan: inv.plan || plan,
    }));

    // Use subscription data if available, otherwise use organization defaults
    const subscriptionPrice = subscription 
      ? Number(subscription.price) 
      : (planPricing[plan] || 0);
    
    const subscriptionStatus = subscription?.status || organization.subscriptionStatus;

    return NextResponse.json({
      subscription: {
        plan: organization.plan,
        status: subscriptionStatus,
        price: subscriptionPrice,
        nextBillingDate: nextBillingDate.toISOString(),
        daysUntilRenewal,
        trialEndsAt: organization.trialEndsAt?.toISOString() || null,
      },
      usage,
      invoices,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error) {
    console.error("Error fetching billing info:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing information" },
      { status: 500 }
    );
  }
}

// POST /api/billing/upgrade - Initiate plan upgrade
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return NextResponse.json(
        { error: "Only owners can upgrade subscription" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { plan } = body as { plan: string };

    if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan specified" },
        { status: 400 }
      );
    }

    // Get user's organization
    const membership = await db
      .select({
        organizationId: organizationMembers.organizationId,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, session.user.id))
      .limit(1);

    if (!membership[0]?.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // In production, this would:
    // 1. Create a payment intent with Mayar
    // 2. Return a payment URL for the user to complete payment
    // 3. Webhook from Mayar would update the subscription status
    
    // For now, we'll just update the plan directly (development mode)
    await db
      .update(organizations)
      .set({
        plan: plan as "starter" | "pro" | "enterprise",
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, membership[0].organizationId));

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan`,
      // In production, this would include payment URL:
      // paymentUrl: "https://mayar.id/pay/xxx"
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return NextResponse.json(
      { error: "Failed to upgrade subscription" },
      { status: 500 }
    );
  }
}
