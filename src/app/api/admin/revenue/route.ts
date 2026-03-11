import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import {
  db,
  orders,
  subscriptionInvoices,
} from "@/lib/db";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";

// GET /api/admin/revenue - Get detailed revenue breakdown
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const isAdmin = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all"; // all, month, year

    // Date filtering
    const now = new Date();
    let startDate: Date;
    
    if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(2020, 0, 1); // All time
    }

    // 1. Transaction Fees (from orders with Mayar payments)
    const [transactionFeeStats] = await db
      .select({
        totalFees: sql<string>`COALESCE(SUM(${orders.transactionFee}), 0)`,
        transactionCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.paymentStatus} = 'paid' AND ${orders.transactionFee} > 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "paid"),
          gte(orders.paidAt, startDate)
        )
      );

    // 2. Subscription Revenue
    const [subscriptionRevenue] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
        paidCount: sql<number>`COUNT(*) FILTER (WHERE ${subscriptionInvoices.status} = 'paid')`,
      })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.status, "paid"),
          gte(subscriptionInvoices.paidAt, startDate)
        )
      );

    // 3. Total Revenue (Transaction Fees + Subscriptions)
    const totalTransactionFees = parseFloat(transactionFeeStats?.totalFees || "0");
    const totalSubscriptionRevenue = parseFloat(subscriptionRevenue?.total || "0");
    const totalRevenue = totalTransactionFees + totalSubscriptionRevenue;

    // 4. Recent transactions for audit
    const recentTransactions = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        transactionFee: orders.transactionFee,
        paymentMethod: orders.paymentMethod,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "paid"),
          gte(orders.paidAt, startDate)
        )
      )
      .orderBy(desc(orders.paidAt))
      .limit(20);

    // 5. Recent subscription payments
    const recentSubscriptions = await db
      .select({
        id: subscriptionInvoices.id,
        invoiceNumber: subscriptionInvoices.invoiceNumber,
        amount: subscriptionInvoices.amount,
        plan: subscriptionInvoices.plan,
        status: subscriptionInvoices.status,
        paidAt: subscriptionInvoices.paidAt,
      })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.status, "paid"),
          gte(subscriptionInvoices.paidAt, startDate)
        )
      )
      .orderBy(desc(subscriptionInvoices.paidAt))
      .limit(10);

    // 6. This month's breakdown for comparison
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [thisMonthFees] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.transactionFee}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, "paid"),
          gte(orders.paidAt, startOfMonth)
        )
      );

    const [thisMonthSubscriptions] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${subscriptionInvoices.amount}), 0)`,
      })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.status, "paid"),
          gte(subscriptionInvoices.paidAt, startOfMonth)
        )
      );

    return NextResponse.json({
      summary: {
        totalRevenue,
        transactionFees: totalTransactionFees,
        subscriptionRevenue: totalSubscriptionRevenue,
        transactionCount: Number(transactionFeeStats?.transactionCount || 0),
        subscriptionCount: Number(subscriptionRevenue?.paidCount || 0),
      },
      thisMonth: {
        transactionFees: parseFloat(thisMonthFees?.total || "0"),
        subscriptionRevenue: parseFloat(thisMonthSubscriptions?.total || "0"),
      },
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        total: parseFloat(t.total),
        transactionFee: parseFloat(t.transactionFee),
        paidAt: t.paidAt?.toISOString(),
      })),
      recentSubscriptions: recentSubscriptions.map((s) => ({
        ...s,
        amount: parseFloat(s.amount),
        paidAt: s.paidAt?.toISOString(),
      })),
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue stats" },
      { status: 500 }
    );
  }
}
