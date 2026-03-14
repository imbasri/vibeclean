/**
 * Tax Report API
 * 
 * Generate tax report for business with:
 * - Monthly/Quarterly breakdown
 * - Tax settings integration
 * - Date range filtering
 * - Branch filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, orders, organizationMembers, branches, taxSettings, organizations } from "@/lib/db";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";

async function getUserOrgAndBranches(userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (!member) return { orgId: null, branchIds: [] as string[], orgName: null };

  const orgBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.organizationId, member.organizationId));

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, member.organizationId));

  return {
    orgId: member.organizationId,
    branches: orgBranches,
    orgName: org?.name || null,
  };
}

interface TaxReportItem {
  period: string;
  periodKey: string;
  year: number;
  month?: number;
  quarter?: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  taxableAmount: number;
  taxAmount: number;
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
    const viewMode = searchParams.get("view") || "monthly"; // monthly | quarterly
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const quarterParam = searchParams.get("quarter"); // 1, 2, 3, 4

    const { orgId, branches, orgName } = await getUserOrgAndBranches(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const branchIds = branchId && branches.find(b => b.id === branchId) 
      ? [branchId] 
      : branches.map(b => b.id);

    // Fetch tax settings for this organization
    const [taxConfig] = await db
      .select({
        taxName: taxSettings.taxName,
        taxType: taxSettings.taxType,
        taxRate: taxSettings.taxRate,
        isActive: taxSettings.isActive,
        taxNumber: taxSettings.taxNumber,
        taxAddress: taxSettings.taxAddress,
      })
      .from(taxSettings)
      .where(eq(taxSettings.organizationId, orgId));

    const taxRate = taxConfig?.isActive ? Number(taxConfig?.taxRate || 0) : 0;
    const taxType = taxConfig?.taxType || "percentage";
    const taxName = taxConfig?.taxName || "PPN";

    // Build date filters
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else if (quarterParam) {
      const q = parseInt(quarterParam);
      const qStartMonth = (q - 1) * 3;
      startDate = new Date(year, qStartMonth, 1);
      endDate = new Date(year, qStartMonth + 3, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    // Calculate tax amount helper
    const calculateTax = (amount: number): number => {
      if (!taxConfig?.isActive || taxRate === 0) return 0;
      if (taxType === "percentage") {
        return Math.round(amount * (taxRate / 100));
      }
      // Fixed amount per order
      return taxRate;
    };

    const report: TaxReportItem[] = [];

    if (viewMode === "quarterly") {
      // Quarterly breakdown
      for (let q = 1; q <= 4; q++) {
        const qStartMonth = (q - 1) * 3;
        const qStart = new Date(year, qStartMonth, 1);
        const qEnd = new Date(year, qStartMonth + 3, 0, 23, 59, 59);

        // Skip if quarter is outside selected date range
        if (qEnd < startDate || qStart > endDate) continue;

        const effectiveStart = qStart < startDate ? startDate : qStart;
        const effectiveEnd = qEnd > endDate ? endDate : qEnd;

        const quarterlyData = await db
          .select({
            totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
            totalOrders: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, effectiveStart),
            lte(orders.createdAt, effectiveEnd),
            eq(orders.paymentStatus, "paid")
          ));

        const revenue = Number(quarterlyData[0]?.totalRevenue || 0);
        const orderCount = Number(quarterlyData[0]?.totalOrders || 0);
        const taxableAmount = revenue;
        const taxAmount = calculateTax(revenue);

        report.push({
          period: `Q${q} ${year}`,
          periodKey: `q${q}`,
          year,
          quarter: q,
          totalRevenue: revenue,
          totalOrders: orderCount,
          avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
          taxableAmount,
          taxAmount,
        });
      }
    } else {
      // Monthly breakdown
      for (let month = 0; month < 12; month++) {
        const mStart = new Date(year, month, 1);
        const mEnd = new Date(year, month + 1, 0, 23, 59, 59);

        // Skip if month is outside selected date range
        if (mEnd < startDate || mStart > endDate) continue;

        const effectiveStart = mStart < startDate ? startDate : mStart;
        const effectiveEnd = mEnd > endDate ? endDate : mEnd;

        const monthlyData = await db
          .select({
            totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
            totalOrders: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, effectiveStart),
            lte(orders.createdAt, effectiveEnd),
            eq(orders.paymentStatus, "paid")
          ));

        const revenue = Number(monthlyData[0]?.totalRevenue || 0);
        const orderCount = Number(monthlyData[0]?.totalOrders || 0);
        const taxableAmount = revenue;
        const taxAmount = calculateTax(revenue);

        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        report.push({
          period: monthNames[month],
          periodKey: `m${month + 1}`,
          year,
          month: month + 1,
          totalRevenue: revenue,
          totalOrders: orderCount,
          avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
          taxableAmount,
          taxAmount,
        });
      }
    }

    // Calculate totals
    const yearlyTotal = report.reduce((sum, item) => sum + item.totalRevenue, 0);
    const yearlyOrders = report.reduce((sum, item) => sum + item.totalOrders, 0);
    const totalTaxable = report.reduce((sum, item) => sum + item.taxableAmount, 0);
    const totalTax = report.reduce((sum, item) => sum + item.taxAmount, 0);

    // Get branches info
    const branchInfo = branchIds.length === 1 
      ? branches.filter(b => b.id === branchIds[0])
      : branches;

    return NextResponse.json({
      success: true,
      year,
      viewMode,
      branchId: branchIds.length === 1 ? branchIds[0] : null,
      branchName: branchIds.length === 1 ? branchInfo[0]?.name : "All Branches",
      branches: branches.map(b => ({ id: b.id, name: b.name })),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      taxSettings: {
        taxName,
        taxType,
        taxRate,
        isActive: taxConfig?.isActive || false,
        taxNumber: taxConfig?.taxNumber || null,
        taxAddress: taxConfig?.taxAddress || null,
      },
      report,
      summary: {
        yearlyTotal,
        yearlyOrders,
        avgOrderValue: yearlyOrders > 0 ? yearlyTotal / yearlyOrders : 0,
        totalTaxableAmount: totalTaxable,
        totalTax,
        effectiveTaxRate: totalTaxable > 0 ? (totalTax / totalTaxable) * 100 : 0,
      },
      organizationName: orgName,
    });
  } catch (error) {
    console.error("[Tax Report] GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate tax report", details: String(error) },
      { status: 500 }
    );
  }
}
