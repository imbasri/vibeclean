import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isSuperAdmin } from "@/lib/admin";
import {
  db,
  organizations,
  subscriptions,
  subscriptionInvoices,
  branches,
  orders,
  users,
  organizationMembers,
} from "@/lib/db";
import { eq, sql, desc, count, and } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// GET /api/admin/organizations/[id] - Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.user.email)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get organization with owner info
    const [org] = await db
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
        ownerPhone: users.phone,
        ownerImage: users.image,
      })
      .from(organizations)
      .leftJoin(users, eq(users.id, organizations.ownerId))
      .where(eq(organizations.id, id));

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get subscription details
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, id));

    // Get subscription invoices
    const invoices = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.organizationId, id))
      .orderBy(desc(subscriptionInvoices.createdAt))
      .limit(20);

    // Get branches
    const branchList = await db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
        phone: branches.phone,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
      })
      .from(branches)
      .where(eq(branches.organizationId, id))
      .orderBy(desc(branches.createdAt));

    // Get staff count
    const [staffCount] = await db
      .select({ count: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, id));

    // Get order stats (all time)
    const [allTimeStats] = await db
      .select({
        totalOrders: count(),
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total} ELSE 0 END), 0)`,
        paidOrders: sql<number>`COUNT(CASE WHEN ${orders.paymentStatus} = 'paid' THEN 1 END)`,
        pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.paymentStatus} = 'pending' THEN 1 END)`,
      })
      .from(orders)
      .innerJoin(branches, eq(branches.id, orders.branchId))
      .where(eq(branches.organizationId, id));

    // Get order stats (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [thisMonthStats] = await db
      .select({
        totalOrders: count(),
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total} ELSE 0 END), 0)`,
      })
      .from(orders)
      .innerJoin(branches, eq(branches.id, orders.branchId))
      .where(
        and(
          eq(branches.organizationId, id),
          sql`${orders.createdAt} >= ${startOfMonth.toISOString()}`
        )
      );

    // Get monthly order trend (last 6 months)
    const monthlyTrend = await db
      .select({
        month: sql<string>`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`,
        orderCount: count(),
        revenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.total} ELSE 0 END), 0)`,
      })
      .from(orders)
      .innerJoin(branches, eq(branches.id, orders.branchId))
      .where(
        and(
          eq(branches.organizationId, id),
          sql`${orders.createdAt} >= NOW() - INTERVAL '6 months'`
        )
      )
      .groupBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${orders.createdAt}, 'YYYY-MM')`);

    // Get recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        status: orders.status,
        createdAt: orders.createdAt,
        branchName: branches.name,
      })
      .from(orders)
      .innerJoin(branches, eq(branches.id, orders.branchId))
      .where(eq(branches.organizationId, id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        trialEndsAt: org.trialEndsAt,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        owner: {
          id: org.ownerId,
          name: org.ownerName,
          email: org.ownerEmail,
          phone: org.ownerPhone,
          image: org.ownerImage,
        },
      },
      subscription: subscription ? {
        id: subscription.id,
        billingCycle: subscription.billingCycle,
        price: parseFloat(subscription.price || "0"),
        monthlyOrderCount: subscription.monthlyOrderCount,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        mayarCustomerId: subscription.mayarCustomerId,
        createdAt: subscription.createdAt,
      } : null,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: parseFloat(inv.amount || "0"),
        status: inv.status,
        paidAt: inv.paidAt,
        billingCycle: inv.billingCycle,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        createdAt: inv.createdAt,
      })),
      branches: branchList,
      stats: {
        branchCount: branchList.length,
        staffCount: staffCount?.count || 0,
        allTime: {
          totalOrders: allTimeStats?.totalOrders || 0,
          totalRevenue: parseFloat(allTimeStats?.totalRevenue || "0"),
          paidOrders: allTimeStats?.paidOrders || 0,
          pendingOrders: allTimeStats?.pendingOrders || 0,
        },
        thisMonth: {
          totalOrders: thisMonthStats?.totalOrders || 0,
          totalRevenue: parseFloat(thisMonthStats?.totalRevenue || "0"),
        },
        monthlyTrend: monthlyTrend.map((m) => ({
          month: m.month,
          orderCount: m.orderCount,
          revenue: parseFloat(m.revenue || "0"),
        })),
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: parseFloat(o.total || "0"),
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: o.createdAt,
        branchName: o.branchName,
      })),
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
