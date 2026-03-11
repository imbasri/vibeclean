import { NextRequest, NextResponse } from "next/server";
import { PLAN_PRICING } from "@/lib/admin";
import { checkAdminAccess } from "@/lib/admin-access";
import {
  db,
  organizations,
  subscriptions,
  subscriptionInvoices,
  branches,
  orders,
} from "@/lib/db";
import { eq, sql, count, and, gte, lte } from "drizzle-orm";

// GET /api/admin/stats - Get admin dashboard stats
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const isAdmin = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 1. Organization stats
    const [orgStats] = await db
      .select({
        total: count(),
        starter: sql<number>`COUNT(*) FILTER (WHERE ${organizations.plan} = 'starter')`,
        pro: sql<number>`COUNT(*) FILTER (WHERE ${organizations.plan} = 'pro')`,
        enterprise: sql<number>`COUNT(*) FILTER (WHERE ${organizations.plan} = 'enterprise')`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${organizations.subscriptionStatus} = 'active')`,
        trial: sql<number>`COUNT(*) FILTER (WHERE ${organizations.subscriptionStatus} = 'trial')`,
        expired: sql<number>`COUNT(*) FILTER (WHERE ${organizations.subscriptionStatus} = 'expired')`,
      })
      .from(organizations);

    // 2. New organizations this month
    const [newOrgsThisMonth] = await db
      .select({ count: count() })
      .from(organizations)
      .where(gte(organizations.createdAt, startOfMonth));

    // 3. New organizations last month (for comparison)
    const [newOrgsLastMonth] = await db
      .select({ count: count() })
      .from(organizations)
      .where(
        and(
          gte(organizations.createdAt, startOfLastMonth),
          lte(organizations.createdAt, endOfLastMonth)
        )
      );

    // 4. Revenue stats from paid subscription invoices
    const [revenueStats] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
        paidInvoices: count(),
      })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.status, "paid"));

    // 5. Revenue this month
    const [revenueThisMonth] = await db
      .select({
        amount: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
      })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.status, "paid"),
          gte(subscriptionInvoices.paidAt, startOfMonth)
        )
      );

    // 6. Revenue last month
    const [revenueLastMonth] = await db
      .select({
        amount: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
      })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.status, "paid"),
          gte(subscriptionInvoices.paidAt, startOfLastMonth),
          lte(subscriptionInvoices.paidAt, endOfLastMonth)
        )
      );

    // 7. Order stats (total across all organizations)
    const [orderStats] = await db
      .select({
        totalOrders: count(),
        totalGMV: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total} ELSE 0 END), 0)`,
      })
      .from(orders);

    // 8. Orders this month
    const [ordersThisMonth] = await db
      .select({
        count: count(),
        gmv: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total} ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(gte(orders.createdAt, startOfMonth));

    // 9. Branch count
    const [branchStats] = await db
      .select({ total: count() })
      .from(branches);

    // 10. Monthly Recurring Revenue (MRR) calculation
    // MRR = (Pro subscribers * Pro monthly price) + (Enterprise subscribers * Enterprise monthly price)
    const proCount = Number(orgStats?.pro || 0);
    const enterpriseCount = Number(orgStats?.enterprise || 0);
    const mrr = 
      proCount * PLAN_PRICING.pro.monthly + 
      enterpriseCount * PLAN_PRICING.enterprise.monthly;

    // Calculate growth percentages
    const orgGrowth = newOrgsLastMonth?.count 
      ? ((newOrgsThisMonth?.count || 0) - newOrgsLastMonth.count) / newOrgsLastMonth.count * 100 
      : 0;
    
    const revenueGrowth = parseFloat(revenueLastMonth?.amount || "0") > 0
      ? (parseFloat(revenueThisMonth?.amount || "0") - parseFloat(revenueLastMonth?.amount || "0")) / parseFloat(revenueLastMonth?.amount || "0") * 100
      : 0;

    return NextResponse.json({
      organizations: {
        total: orgStats?.total || 0,
        byPlan: {
          starter: Number(orgStats?.starter || 0),
          pro: Number(orgStats?.pro || 0),
          enterprise: Number(orgStats?.enterprise || 0),
        },
        byStatus: {
          active: Number(orgStats?.active || 0),
          trial: Number(orgStats?.trial || 0),
          expired: Number(orgStats?.expired || 0),
        },
        newThisMonth: newOrgsThisMonth?.count || 0,
        growth: Math.round(orgGrowth * 10) / 10, // 1 decimal place
      },
      revenue: {
        total: parseFloat(revenueStats?.totalRevenue || "0"),
        thisMonth: parseFloat(revenueThisMonth?.amount || "0"),
        lastMonth: parseFloat(revenueLastMonth?.amount || "0"),
        growth: Math.round(revenueGrowth * 10) / 10,
        mrr,
        arr: mrr * 12, // Annual Recurring Revenue
      },
      orders: {
        total: orderStats?.totalOrders || 0,
        thisMonth: ordersThisMonth?.count || 0,
        gmv: parseFloat(orderStats?.totalGMV || "0"),
        gmvThisMonth: parseFloat(ordersThisMonth?.gmv || "0"),
      },
      branches: {
        total: branchStats?.total || 0,
      },
      period: {
        current: {
          start: startOfMonth.toISOString(),
          end: now.toISOString(),
        },
        previous: {
          start: startOfLastMonth.toISOString(),
          end: endOfLastMonth.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
