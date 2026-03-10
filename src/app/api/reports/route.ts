import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  orders,
  orderItems,
  services,
  customers,
  branches,
  organizationMembers,
  branchPermissions,
} from "@/lib/db";
import { eq, and, inArray, sql, gte, lte, desc } from "drizzle-orm";

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

  return [...new Set(memberships.map((m) => m.branchId))];
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

type PeriodType = "today" | "week" | "month" | "year";

function getDateRange(period: PeriodType): {
  startDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
} {
  const now = new Date();
  let startDate: Date;
  let previousStartDate: Date;
  let previousEndDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 1);
      previousEndDate = new Date(startDate);
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
      previousEndDate = new Date(startDate);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      previousEndDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return { startDate, previousStartDate, previousEndDate };
}

// GET /api/reports - Get comprehensive report data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const period = (searchParams.get("period") || "week") as PeriodType;

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);
    const organizationId = await getUserOrganizationId(session.user.id);
    const userIsOwner = await isOwner(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({
        revenue: {
          total: 0,
          change: 0,
          isPositive: true,
          daily: [],
        },
        orders: {
          total: 0,
          change: 0,
          isPositive: true,
          byStatus: [],
        },
        services: [],
        customers: {
          total: 0,
          new: 0,
          returning: 0,
          newPercentage: 0,
          topCustomers: [],
        },
        branches: [],
      });
    }

    // Filter by specific branch or all user's branches
    const targetBranchIds =
      branchId && userBranchIds.includes(branchId)
        ? [branchId]
        : userBranchIds;

    const { startDate, previousStartDate, previousEndDate } = getDateRange(period);

    // ==========================================
    // 1. REVENUE DATA
    // ==========================================
    
    // Current period revenue
    const currentRevenueResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, startDate)
        )
      );

    // Previous period revenue
    const previousRevenueResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, previousStartDate),
          lte(orders.createdAt, previousEndDate)
        )
      );

    const currentRevenue = parseFloat(currentRevenueResult[0]?.total || "0");
    const previousRevenue = parseFloat(previousRevenueResult[0]?.total || "0");
    const revenueChange = previousRevenue > 0 
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 1000) / 10
      : 0;

    // Daily revenue breakdown (last 7 days for week, or appropriate for period)
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    
    const dailyRevenueQuery = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        amount: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Fill in missing days with 0
    const dailyRevenue: { day: string; amount: number; date: string }[] = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = dayNames[date.getDay()];
      
      const found = dailyRevenueQuery.find(
        (r) => r.date === dateStr
      );
      
      dailyRevenue.push({
        day: dayName,
        amount: found ? parseFloat(found.amount) : 0,
        date: dateStr,
      });
    }

    // ==========================================
    // 2. ORDER STATS
    // ==========================================
    
    // Current period orders by status
    const currentOrdersResult = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)::int`,
        processing: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('processing', 'washing', 'drying', 'ironing') THEN 1 END)::int`,
        ready: sql<number>`COUNT(CASE WHEN ${orders.status} = 'ready' THEN 1 END)::int`,
        completed: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('completed', 'delivered') THEN 1 END)::int`,
        cancelled: sql<number>`COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, startDate)
        )
      );

    // Previous period orders count
    const previousOrdersResult = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, previousStartDate),
          lte(orders.createdAt, previousEndDate)
        )
      );

    const currentOrders = currentOrdersResult[0];
    const previousOrdersTotal = previousOrdersResult[0]?.total || 0;
    const ordersChange = previousOrdersTotal > 0
      ? Math.round(((currentOrders.total - previousOrdersTotal) / previousOrdersTotal) * 1000) / 10
      : 0;

    const totalNonCancelled = currentOrders.total - (currentOrders.cancelled || 0);
    const ordersByStatus = [
      {
        status: "Selesai",
        count: currentOrders.completed || 0,
        percentage: totalNonCancelled > 0 ? Math.round(((currentOrders.completed || 0) / totalNonCancelled) * 100) : 0,
        color: "bg-green-500",
      },
      {
        status: "Diproses",
        count: currentOrders.processing || 0,
        percentage: totalNonCancelled > 0 ? Math.round(((currentOrders.processing || 0) / totalNonCancelled) * 100) : 0,
        color: "bg-blue-500",
      },
      {
        status: "Menunggu",
        count: (currentOrders.pending || 0) + (currentOrders.ready || 0),
        percentage: totalNonCancelled > 0 ? Math.round((((currentOrders.pending || 0) + (currentOrders.ready || 0)) / totalNonCancelled) * 100) : 0,
        color: "bg-amber-500",
      },
      {
        status: "Dibatalkan",
        count: currentOrders.cancelled || 0,
        percentage: currentOrders.total > 0 ? Math.round(((currentOrders.cancelled || 0) / currentOrders.total) * 100) : 0,
        color: "bg-red-500",
      },
    ];

    // ==========================================
    // 3. SERVICE STATS (Top Services)
    // ==========================================
    
    const serviceStatsResult = await db
      .select({
        serviceId: orderItems.serviceId,
        serviceName: orderItems.serviceName,
        totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${orderItems.subtotal}::numeric), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, startDate),
          sql`${orders.status} != 'cancelled'`
        )
      )
      .groupBy(orderItems.serviceId, orderItems.serviceName)
      .orderBy(desc(sql`COUNT(DISTINCT ${orderItems.orderId})`))
      .limit(5);

    const totalServiceOrders = serviceStatsResult.reduce((sum, s) => sum + s.totalOrders, 0);
    const serviceStats = serviceStatsResult.map((s) => ({
      name: s.serviceName,
      orders: s.totalOrders,
      revenue: parseFloat(s.totalRevenue),
      percentage: totalServiceOrders > 0 ? Math.round((s.totalOrders / totalServiceOrders) * 100) : 0,
    }));

    // ==========================================
    // 4. CUSTOMER STATS
    // ==========================================
    
    let customerStats = {
      total: 0,
      new: 0,
      returning: 0,
      newPercentage: 0,
      topCustomers: [] as { name: string; orders: number; spent: number }[],
    };

    if (organizationId) {
      // Total customers
      const totalCustomersResult = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(customers)
        .where(eq(customers.organizationId, organizationId));

      // New customers in period
      const newCustomersResult = await db
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

      const totalCustomers = totalCustomersResult[0]?.count || 0;
      const newCustomers = newCustomersResult[0]?.count || 0;
      const returningCustomers = totalCustomers - newCustomers;

      // Top customers by spending
      const topCustomersResult = await db
        .select({
          name: customers.name,
          totalOrders: customers.totalOrders,
          totalSpent: customers.totalSpent,
        })
        .from(customers)
        .where(eq(customers.organizationId, organizationId))
        .orderBy(desc(sql`${customers.totalSpent}::numeric`))
        .limit(4);

      customerStats = {
        total: totalCustomers,
        new: newCustomers,
        returning: returningCustomers > 0 ? returningCustomers : 0,
        newPercentage: totalCustomers > 0 ? Math.round((newCustomers / totalCustomers) * 100) : 0,
        topCustomers: topCustomersResult.map((c) => ({
          name: c.name,
          orders: c.totalOrders,
          spent: parseFloat(c.totalSpent),
        })),
      };
    }

    // ==========================================
    // 5. BRANCH COMPARISON (Owner only)
    // ==========================================
    
    let branchComparison: {
      name: string;
      revenue: number;
      orders: number;
      percentage: number;
    }[] = [];

    if (userIsOwner && userBranchIds.length > 1) {
      const branchStatsResult = await db
        .select({
          branchId: orders.branchId,
          branchName: branches.name,
          totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
          totalOrders: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .innerJoin(branches, eq(branches.id, orders.branchId))
        .where(
          and(
            inArray(orders.branchId, userBranchIds),
            gte(orders.createdAt, startDate)
          )
        )
        .groupBy(orders.branchId, branches.name)
        .orderBy(desc(sql`SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END)`));

      const totalBranchRevenue = branchStatsResult.reduce(
        (sum, b) => sum + parseFloat(b.totalRevenue),
        0
      );

      branchComparison = branchStatsResult.map((b) => ({
        name: b.branchName,
        revenue: parseFloat(b.totalRevenue),
        orders: b.totalOrders,
        percentage: totalBranchRevenue > 0
          ? Math.round((parseFloat(b.totalRevenue) / totalBranchRevenue) * 100)
          : 0,
      }));
    }

    // ==========================================
    // BUILD RESPONSE
    // ==========================================
    
    return NextResponse.json({
      revenue: {
        total: currentRevenue,
        change: Math.abs(revenueChange),
        isPositive: revenueChange >= 0,
        daily: dailyRevenue,
      },
      orders: {
        total: currentOrders.total,
        change: Math.abs(ordersChange),
        isPositive: ordersChange >= 0,
        byStatus: ordersByStatus,
      },
      services: serviceStats,
      customers: customerStats,
      branches: branchComparison,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
