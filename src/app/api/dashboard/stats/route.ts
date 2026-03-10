import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  orders,
  customers,
  organizationMembers,
  branchPermissions,
} from "@/lib/db";
import { eq, and, inArray, sql, gte, lte } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to get user's accessible branch IDs
async function getUserBranchIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({
      branchId: branchPermissions.branchId,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(eq(organizationMembers.userId, userId));

  return memberships.map((m) => m.branchId);
}

// Helper to get user's organization ID
async function getUserOrganizationId(userId: string): Promise<string | null> {
  const membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organizationId || null;
}

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const period = searchParams.get("period") || "month"; // day, week, month, year

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);
    const organizationId = await getUserOrganizationId(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({
        stats: {
          totalRevenue: 0,
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          averageOrderValue: 0,
          newCustomers: 0,
        },
        recentOrders: [],
      });
    }

    // Filter by specific branch or all user's branches
    const targetBranchIds =
      branchId && userBranchIds.includes(branchId)
        ? [branchId]
        : userBranchIds;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
    }

    // Get current period stats
    const currentStats = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
        totalOrders: sql<number>`COUNT(*)::int`,
        pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('pending', 'processing', 'washing', 'drying', 'ironing') THEN 1 END)::int`,
        completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('completed', 'delivered') THEN 1 END)::int`,
        readyOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'ready' THEN 1 END)::int`,
        cancelledOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, startDate)
        )
      );

    // Get previous period stats for comparison
    const previousStats = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
        totalOrders: sql<number>`COUNT(*)::int`,
        completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('completed', 'delivered') THEN 1 END)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, previousStartDate),
          lte(orders.createdAt, startDate)
        )
      );

    // Get new customers count (only if organization ID available)
    let newCustomers = 0;
    if (organizationId) {
      const customerCount = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            gte(customers.createdAt, startDate)
          )
        );
      newCustomers = customerCount[0]?.count || 0;
    }

    // Get recent orders (last 5)
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(inArray(orders.branchId, targetBranchIds))
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(5);

    // Calculate stats
    const stats = currentStats[0];
    const prevStats = previousStats[0];
    
    const totalRevenue = parseFloat(stats?.totalRevenue || "0");
    const totalOrders = stats?.totalOrders || 0;
    const prevTotalRevenue = parseFloat(prevStats?.totalRevenue || "0");
    const prevTotalOrders = prevStats?.totalOrders || 0;

    // Calculate trends (percentage change)
    const revenueTrend = prevTotalRevenue > 0 
      ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100)
      : 0;
    
    const ordersTrend = prevTotalOrders > 0
      ? Math.round(((totalOrders - prevTotalOrders) / prevTotalOrders) * 100)
      : 0;

    const completedOrdersTrend = (prevStats?.completedOrders || 0) > 0
      ? Math.round((((stats?.completedOrders || 0) - (prevStats?.completedOrders || 0)) / (prevStats?.completedOrders || 1)) * 100)
      : 0;

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders: stats?.pendingOrders || 0,
        completedOrders: stats?.completedOrders || 0,
        readyOrders: stats?.readyOrders || 0,
        cancelledOrders: stats?.cancelledOrders || 0,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        newCustomers,
      },
      trends: {
        revenue: { value: Math.abs(revenueTrend), isPositive: revenueTrend >= 0 },
        orders: { value: Math.abs(ordersTrend), isPositive: ordersTrend >= 0 },
        completed: { value: Math.abs(completedOrdersTrend), isPositive: completedOrdersTrend >= 0 },
      },
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: parseFloat(order.total),
      })),
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
