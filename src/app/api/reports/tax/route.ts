/**
 * Tax Report API
 * 
 * Generate tax report for business
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, orders, organizationMembers, branches } from "@/lib/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

async function getUserOrgAndBranches(userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (!member) return { orgId: null, branchIds: [] as string[] };

  const orgBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.organizationId, member.organizationId));

  return {
    orgId: member.organizationId,
    branches: orgBranches,
  };
}

interface TaxReportItem {
  month: string;
  year: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  taxableAmount: number; // Revenue - refunds
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const branchId = searchParams.get("branch");

    const { orgId, branches } = await getUserOrgAndBranches(session.user.id);
    
    if (!orgId || branches.length === 0) {
      return NextResponse.json({ error: "No branches accessible" }, { status: 403 });
    }

    const branchIds = branchId && branches.find(b => b.id === branchId) 
      ? [branchId] 
      : branches.map(b => b.id);

    const report: TaxReportItem[] = [];

    // Generate monthly report for the year
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      const monthlyData = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
          totalOrders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, branchIds[0]), // Use first branch for simplicity
          gte(orders.createdAt, startOfMonth),
          lte(orders.createdAt, endOfMonth),
          eq(orders.paymentStatus, "paid")
        ));

      const revenue = Number(monthlyData[0]?.totalRevenue || 0);
      const orderCount = Number(monthlyData[0]?.totalOrders || 0);

      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];

      report.push({
        month: monthNames[month],
        year,
        totalRevenue: revenue,
        totalOrders: orderCount,
        avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
        taxableAmount: revenue, // For simplicity, assuming all revenue is taxable
      });
    }

    // Calculate totals
    const yearlyTotal = report.reduce((sum, item) => sum + item.totalRevenue, 0);
    const yearlyOrders = report.reduce((sum, item) => sum + item.totalOrders, 0);

    // Format response
    return NextResponse.json({
      success: true,
      year,
      branchId: branchIds.length === 1 ? branchIds[0] : null,
      report,
      summary: {
        yearlyTotal,
        yearlyOrders,
        avgOrderValue: yearlyOrders > 0 ? yearlyTotal / yearlyOrders : 0,
        // Estimate tax (e.g., 0.5% from revenue as simplified example)
        estimatedTax: yearlyTotal * 0.005,
      },
    });
  } catch (error) {
    console.error("[Tax Report] GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate tax report" },
      { status: 500 }
    );
  }
}
