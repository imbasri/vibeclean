import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { db, orders } from "@/lib/db";
import { eq, sql, gte, and } from "drizzle-orm";

// GET /api/founder/transaction-fee - Get transaction fee statistics
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";

    // Date filtering
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Build where clause
    const whereClause = and(
      eq(orders.status, "completed" as any),
      gte(orders.createdAt, startDate)
    );

    // Total transaction fee
    const [totalFee] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.transactionFee}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(whereClause);

    // Fee this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [thisMonthFee] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.transactionFee}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(
        eq(orders.status, "completed" as any),
        gte(orders.createdAt, startOfMonth)
      ));

    // Fee last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const [lastMonthFee] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.transactionFee}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(
        eq(orders.status, "completed" as any),
        gte(orders.createdAt, startOfLastMonth),
        sql`${orders.createdAt} <= ${endOfLastMonth}`
      ));

    // Calculate growth
    const growth = lastMonthFee && lastMonthFee.total > 0 
      ? ((Number(thisMonthFee?.total || 0) - Number(lastMonthFee.total)) / Number(lastMonthFee.total)) * 100 
      : 0;

    // Average fee per transaction
    const avgFee = totalFee && totalFee.count > 0 
      ? Number(totalFee.total) / Number(totalFee.count) 
      : 0;

    return NextResponse.json({
      total: Number(totalFee?.total || 0),
      totalTransactions: Number(totalFee?.count || 0),
      thisMonth: {
        fee: Number(thisMonthFee?.total || 0),
        transactions: Number(thisMonthFee?.count || 0),
      },
      lastMonth: {
        fee: Number(lastMonthFee?.total || 0),
        transactions: Number(lastMonthFee?.count || 0),
      },
      growth: Math.round(growth * 100) / 100,
      averageFee: Math.round(avgFee),
    });
  } catch (error) {
    console.error("[Transaction Fee API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
