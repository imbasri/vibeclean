import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isSuperAdmin } from "@/lib/admin";
import {
  db,
  organizations,
  subscriptions,
  branches,
  orders,
  users,
} from "@/lib/db";
import { eq, sql, desc, count } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// GET /api/admin/organizations - List all organizations with subscription data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.user.email)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const planFilter = searchParams.get("plan") || "";
    const statusFilter = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query for organizations with related data
    const offset = (page - 1) * limit;

    // Get organizations with subscription and owner info
    const orgsQuery = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        plan: organizations.plan,
        subscriptionStatus: organizations.subscriptionStatus,
        trialEndsAt: organizations.trialEndsAt,
        ownerId: organizations.ownerId,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        // Owner info
        ownerName: users.name,
        ownerEmail: users.email,
        // Subscription details
        subscriptionId: subscriptions.id,
        billingCycle: subscriptions.billingCycle,
        subscriptionPrice: subscriptions.price,
        monthlyOrderCount: subscriptions.monthlyOrderCount,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        mayarCustomerId: subscriptions.mayarCustomerId,
      })
      .from(organizations)
      .leftJoin(users, eq(users.id, organizations.ownerId))
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .orderBy(sortOrder === "desc" ? desc(organizations.createdAt) : organizations.createdAt)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(organizations);
    const total = totalResult?.count || 0;

    // Get branch counts for each org
    const branchCounts = await db
      .select({
        organizationId: branches.organizationId,
        branchCount: count(),
      })
      .from(branches)
      .groupBy(branches.organizationId);

    const branchCountMap = new Map(
      branchCounts.map((b) => [b.organizationId, b.branchCount])
    );

    // Get order counts for each org (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Enrich organizations with additional data
    const enrichedOrgs = await Promise.all(
      orgsQuery.map(async (org) => {
        // Get order stats for this org
        const [orderStats] = await db
          .select({
            totalOrders: count(),
            totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total} ELSE 0 END), 0)`,
          })
          .from(orders)
          .innerJoin(branches, eq(branches.id, orders.branchId))
          .where(eq(branches.organizationId, org.id));

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          plan: org.plan,
          subscriptionStatus: org.subscriptionStatus,
          trialEndsAt: org.trialEndsAt,
          createdAt: org.createdAt,
          owner: {
            id: org.ownerId,
            name: org.ownerName,
            email: org.ownerEmail,
          },
          subscription: org.subscriptionId ? {
            id: org.subscriptionId,
            billingCycle: org.billingCycle,
            price: parseFloat(org.subscriptionPrice || "0"),
            monthlyOrderCount: org.monthlyOrderCount || 0,
            currentPeriodStart: org.currentPeriodStart,
            currentPeriodEnd: org.currentPeriodEnd,
            mayarCustomerId: org.mayarCustomerId,
          } : null,
          stats: {
            branchCount: branchCountMap.get(org.id) || 0,
            totalOrders: orderStats?.totalOrders || 0,
            totalRevenue: parseFloat(orderStats?.totalRevenue || "0"),
          },
        };
      })
    );

    // Apply filters in memory (for simplicity)
    let filteredOrgs = enrichedOrgs;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrgs = filteredOrgs.filter(
        (org) =>
          org.name.toLowerCase().includes(searchLower) ||
          org.slug.toLowerCase().includes(searchLower) ||
          org.owner.email?.toLowerCase().includes(searchLower) ||
          org.owner.name?.toLowerCase().includes(searchLower)
      );
    }

    if (planFilter) {
      filteredOrgs = filteredOrgs.filter((org) => org.plan === planFilter);
    }

    if (statusFilter) {
      filteredOrgs = filteredOrgs.filter((org) => org.subscriptionStatus === statusFilter);
    }

    return NextResponse.json({
      organizations: filteredOrgs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
