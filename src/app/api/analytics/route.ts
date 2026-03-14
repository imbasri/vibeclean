/**
 * Analytics API
 * 
 * Advanced analytics for owner dashboard with charts and insights
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  orders,
  customers,
  organizationMembers,
  branchPermissions,
  branches,
  services,
  orderItems,
} from "@/lib/db";
import { eq, and, inArray, sql, gte, lte, desc, asc } from "drizzle-orm";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

async function getUserBranchIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ branchId: branchPermissions.branchId })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(eq(organizationMembers.userId, userId));
  return memberships.map((m) => m.branchId);
}

async function getUserOrganizationId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return membership?.organizationId || null;
}

// GET /api/analytics - Get comprehensive analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const period = searchParams.get("period") || "30d";

    const userBranchIds = await getUserBranchIds(session.user.id);
    const organizationId = await getUserOrganizationId(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({ error: "No access to any branch" }, { status: 403 });
    }

    const targetBranchIds = branchId && userBranchIds.includes(branchId) ? [branchId] : userBranchIds;

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    let groupBy: "day" | "week" | "month";

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate.getTime() - 1);
        groupBy = "day";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate.getTime() - 1);
        groupBy = "day";
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate.getTime() - 1);
        groupBy = "week";
        break;
      case "12m":
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        groupBy = "month";
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate.getTime() - 1);
        groupBy = "day";
    }

    // Get current period stats
    const [currentStats] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        totalOrders: sql<number>`COUNT(*)`,
        avgOrderValue: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
        completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
        pendingOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'pending' THEN 1 ELSE 0 END)`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, startDate),
          eq(orders.paymentStatus, "paid")
        )
      );

    // Get previous period stats for comparison
    const [previousStats] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        totalOrders: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.branchId, targetBranchIds),
          gte(orders.createdAt, previousStartDate),
          lte(orders.createdAt, previousEndDate),
          eq(orders.paymentStatus, "paid")
        )
      );

    // Get new customers this period
    const [customerStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        newThisPeriod: sql<number>`SUM(CASE WHEN ${customers.createdAt} >= ${startDate} THEN 1 ELSE 0 END)`,
      })
      .from(customers)
      .innerJoin(organizationMembers, eq(customers.id, organizationMembers.id));

    // Generate chart data
    const chartData = await generateChartData(targetBranchIds, startDate, now, groupBy);

    // Get top services
    const topServices = await getTopServices(targetBranchIds, startDate);

    // Get top customers
    const topCustomers = await getTopCustomers(targetBranchIds, startDate);

    // Calculate growth percentages
    const revenueGrowth = Number(previousStats.totalRevenue) > 0 
      ? ((Number(currentStats.totalRevenue) - Number(previousStats.totalRevenue)) / Number(previousStats.totalRevenue)) * 100
      : 0;

    const ordersGrowth = previousStats.totalOrders > 0
      ? ((Number(currentStats.totalOrders) - Number(previousStats.totalOrders)) / Number(previousStats.totalOrders)) * 100
      : 0;

    // Build response
    return NextResponse.json({
      period,
      summary: {
        totalRevenue: Number(currentStats.totalRevenue) || 0,
        totalOrders: Number(currentStats.totalOrders) || 0,
        avgOrderValue: Number(currentStats.avgOrderValue) || 0,
        completedOrders: Number(currentStats.completedOrders) || 0,
        pendingOrders: Number(currentStats.pendingOrders) || 0,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10,
      },
      previousPeriod: {
        totalRevenue: Number(previousStats.totalRevenue) || 0,
        totalOrders: Number(previousStats.totalOrders) || 0,
      },
      chart: chartData,
      topServices,
      topCustomers,
    });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

async function generateChartData(
  branchIds: string[],
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month"
) {
  const data = [];

  if (groupBy === "day") {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const [dayData] = await db
        .select({
          revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, dayStart),
            lte(orders.createdAt, dayEnd),
            eq(orders.paymentStatus, "paid")
          )
        );

      data.push({
        date: dayStart.toISOString().split("T")[0],
        label: dayStart.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
        revenue: Number(dayData.revenue) || 0,
        orders: Number(dayData.orders) || 0,
      });
    }
  } else if (groupBy === "week") {
    const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      const [weekData] = await db
        .select({
          revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, weekStart),
            lte(orders.createdAt, weekEnd),
            eq(orders.paymentStatus, "paid")
          )
        );

      data.push({
        date: weekStart.toISOString().split("T")[0],
        label: `M${i + 1}`,
        revenue: Number(weekData.revenue) || 0,
        orders: Number(weekData.orders) || 0,
      });
    }
  } else {
    const months = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

      const [monthData] = await db
        .select({
          revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, monthStart),
            lte(orders.createdAt, monthEnd),
            eq(orders.paymentStatus, "paid")
          )
        );

      months.push({
        date: monthStart.toISOString().split("T")[0],
        label: monthStart.toLocaleDateString("id-ID", { month: "short" }),
        revenue: Number(monthData.revenue) || 0,
        orders: Number(monthData.orders) || 0,
      });

      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }

  return data;
}

async function getTopServices(branchIds: string[], startDate: Date) {
  const topServices = await db
    .select({
      serviceId: orderItems.serviceId,
      serviceName: sql<string>`MAX(${services.name})`,
      totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
      totalRevenue: sql<string>`SUM(${orderItems.subtotal})`,
    })
    .from(orderItems)
    .innerJoin(services, eq(orderItems.serviceId, services.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        inArray(orders.branchId, branchIds),
        gte(orders.createdAt, startDate),
        eq(orders.paymentStatus, "paid")
      )
    )
    .groupBy(orderItems.serviceId)
    .orderBy(desc(sql`SUM(${orderItems.subtotal})`))
    .limit(5);

  return topServices.map((s) => ({
    name: s.serviceName || "Unknown",
    quantity: Number(s.totalQuantity) || 0,
    revenue: Number(s.totalRevenue) || 0,
  }));
}

async function getTopCustomers(branchIds: string[], startDate: Date) {
  const topCustomers = await db
    .select({
      customerId: orders.customerId,
      customerName: sql<string>`MAX(${orders.customerName})`,
      totalOrders: sql<number>`COUNT(*)`,
      totalSpent: sql<string>`SUM(${orders.total})`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.branchId, branchIds),
        gte(orders.createdAt, startDate),
        eq(orders.paymentStatus, "paid"),
        sql`${orders.customerId} IS NOT NULL`
      )
    )
    .groupBy(orders.customerId)
    .orderBy(desc(sql`SUM(${orders.total})`))
    .limit(5);

  return topCustomers.map((c) => ({
    name: c.customerName || "Unknown",
    orders: Number(c.totalOrders) || 0,
    spent: Number(c.totalSpent) || 0,
  }));
}
