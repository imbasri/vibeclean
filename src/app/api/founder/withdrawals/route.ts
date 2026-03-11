import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { db, withdrawals, organizations } from "@/lib/db";
import { eq, sql, desc } from "drizzle-orm";

// GET /api/founder/withdrawals - Get all withdrawals
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause
    let whereClause;
    if (status !== "all") {
      whereClause = eq(withdrawals.status, status as any);
    }

    // Get withdrawals with organization info
    const results = await db
      .select({
        id: withdrawals.id,
        organizationId: withdrawals.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        amount: withdrawals.amount,
        status: withdrawals.status,
        bankName: withdrawals.bankName,
        bankAccountNumber: withdrawals.bankAccountNumber,
        bankAccountName: withdrawals.bankAccountName,
        createdAt: withdrawals.createdAt,
        processedAt: withdrawals.processedAt,
        notes: withdrawals.notes,
      })
      .from(withdrawals)
      .innerJoin(organizations, eq(withdrawals.organizationId, organizations.id))
      .where(whereClause)
      .orderBy(desc(withdrawals.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Get total count
    const [{ total }] = await db
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(withdrawals)
      .where(whereClause);

    // Get stats
    const [pendingStats] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${withdrawals.amount}), 0)`,
      })
      .from(withdrawals)
      .where(eq(withdrawals.status, "pending" as any));

    const [completedStats] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${withdrawals.amount}), 0)`,
      })
      .from(withdrawals)
      .where(eq(withdrawals.status, "completed" as any));

    return NextResponse.json({
      withdrawals: results.map(w => ({
        ...w,
        amount: Number(w.amount),
      })),
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
      stats: {
        pending: {
          count: Number(pendingStats?.count || 0),
          total: Number(pendingStats?.total || 0),
        },
        completed: {
          count: Number(completedStats?.count || 0),
          total: Number(completedStats?.total || 0),
        },
      },
    });
  } catch (error) {
    console.error("[Withdrawals API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
