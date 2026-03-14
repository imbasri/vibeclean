import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import {
  db,
  orders,
  subscriptionInvoices,
} from "@/lib/db";
import { eq, gte, lte, sql, and } from "drizzle-orm";

interface RevenueDataPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  transactionFees: number;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, 12m
    
    const now = new Date();
    let startDate: Date;
    let groupBy: "day" | "week" | "month";
    let dataPoints: RevenueDataPoint[] = [];

    // Determine date range and grouping
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = "day";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = "day";
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = "week";
        break;
      case "12m":
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = "month";
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = "day";
    }

    if (groupBy === "month") {
      // Monthly grouping for 12 months
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(now.getFullYear(), month, 1);
        const monthEnd = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59);
        
        if (monthStart > now) continue;

        const monthRevenue = await db
          .select({
            revenue: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
            orders: sql<number>`COUNT(*)`,
            fees: sql<string>`COALESCE(SUM(${orders.transactionFee}), 0)`,
          })
          .from(subscriptionInvoices)
          .leftJoin(orders, eq(orders.id, sql`${orders.id}`))
          .where(
            and(
              eq(subscriptionInvoices.status, "paid"),
              gte(subscriptionInvoices.paidAt, monthStart),
              lte(subscriptionInvoices.paidAt, monthEnd)
            )
          );

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        dataPoints.push({
          date: monthStart.toISOString(),
          label: monthNames[month],
          revenue: parseFloat(monthRevenue[0]?.revenue || "0"),
          orders: Number(monthRevenue[0]?.orders || 0),
          transactionFees: parseFloat(monthRevenue[0]?.fees || "0"),
        });
      }
    } else if (groupBy === "week") {
      // Weekly grouping for 90 days
      const weeks = Math.floor(90 / 7);
      for (let week = 0; week < weeks; week++) {
        const weekStart = new Date(now.getTime() - (weeks - week) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const weekData = await db
          .select({
            revenue: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
            orders: sql<number>`COUNT(*)`,
          })
          .from(subscriptionInvoices)
          .where(
            and(
              eq(subscriptionInvoices.status, "paid"),
              gte(subscriptionInvoices.paidAt, weekStart),
              lte(subscriptionInvoices.paidAt, weekEnd)
            )
          );

        dataPoints.push({
          date: weekStart.toISOString(),
          label: `M${week + 1}`,
          revenue: parseFloat(weekData[0]?.revenue || "0"),
          orders: Number(weekData[0]?.orders || 0),
          transactionFees: 0,
        });
      }
    } else {
      // Daily grouping for 7d and 30d
      const days = period === "7d" ? 7 : 30;
      for (let day = days - 1; day >= 0; day--) {
        const dayStart = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

        const [dayRevenue, dayOrders] = await Promise.all([
          // Subscription revenue
          db
            .select({
              amount: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
            })
            .from(subscriptionInvoices)
            .where(
              and(
                eq(subscriptionInvoices.status, "paid"),
                gte(subscriptionInvoices.paidAt, dayStart),
                lte(subscriptionInvoices.paidAt, dayEnd)
              )
            ),
          // Order data (transaction fees)
          db
            .select({
              totalOrders: sql<number>`COUNT(*)`,
              totalAmount: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
              totalFees: sql<string>`COALESCE(SUM(${orders.transactionFee}), 0)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.paymentStatus, "paid"),
                gte(orders.createdAt, dayStart),
                lte(orders.createdAt, dayEnd)
              )
            ),
        ]);

        const dayLabel = dayStart.toLocaleDateString("id-ID", { 
          weekday: "short", 
          day: "numeric",
          month: "short" 
        });

        dataPoints.push({
          date: dayStart.toISOString(),
          label: dayLabel,
          revenue: parseFloat(dayRevenue[0]?.amount || "0") + parseFloat(dayOrders[0]?.totalFees || "0"),
          orders: Number(dayOrders[0]?.totalOrders || 0),
          transactionFees: parseFloat(dayOrders[0]?.totalFees || "0"),
        });
      }
    }

    // Calculate totals
    const totalRevenue = dataPoints.reduce((sum, dp) => sum + dp.revenue, 0);
    const totalOrders = dataPoints.reduce((sum, dp) => sum + dp.orders, 0);
    const totalFees = dataPoints.reduce((sum, dp) => sum + dp.transactionFees, 0);

    // Calculate average
    const avgRevenue = dataPoints.length > 0 ? totalRevenue / dataPoints.length : 0;

    return NextResponse.json({
      period,
      groupBy,
      data: dataPoints,
      summary: {
        totalRevenue,
        totalOrders,
        totalFees,
        avgRevenue: Math.round(avgRevenue),
      },
    });
  } catch (error) {
    console.error("Error fetching revenue chart:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue chart data" },
      { status: 500 }
    );
  }
}
