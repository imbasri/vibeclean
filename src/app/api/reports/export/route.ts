/**
 * Reports Export API
 * 
 * Handles exporting reports in Excel format
 * 
 * Security:
 * - Requires authentication
 * - Validates organization membership
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  orders,
  organizationMembers,
  branches,
} from "@/lib/db";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { formatOrdersForExport, exportToExcel } from "@/lib/export/excel";

/**
 * Get user's organization ID and accessible branch IDs
 */
async function getUserOrgAndBranches(userId: string): Promise<{
  orgId: string | null;
  branchIds: string[];
}> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (!member) return { orgId: null, branchIds: [] };

  // Get branches for this organization
  const orgBranches = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.organizationId, member.organizationId));

  return {
    orgId: member.organizationId,
    branchIds: orgBranches.map(b => b.id),
  };
}

// ============================================
// GET /api/reports/export
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "excel";
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const branchId = searchParams.get("branch");

    // Get user's organization and branches
    const { branchIds } = await getUserOrgAndBranches(session.user.id);
    
    if (branchIds.length === 0) {
      return NextResponse.json(
        { error: "No branches accessible" },
        { status: 403 }
      );
    }

    // Build filters - must filter by org's branches
    const filters = [inArray(orders.branchId, branchIds)];
    
    if (branchId && branchIds.includes(branchId)) {
      filters.length = 0;
      filters.push(eq(orders.branchId, branchId));
    }

    if (startDate && endDate) {
      filters.push(gte(orders.createdAt, new Date(startDate)));
      filters.push(lte(orders.createdAt, new Date(endDate + "T23:59:59")));
    }

    // Get orders
    const orderList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        subtotal: orders.subtotal,
        discount: orders.discount,
        total: orders.total,
        createdAt: orders.createdAt,
        estimatedCompletionAt: orders.estimatedCompletionAt,
      })
      .from(orders)
      .where(and(...filters))
      .orderBy(desc(orders.createdAt));

    // Format data
    const formattedOrders = orderList.map(order => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: parseFloat(order.subtotal),
      discount: parseFloat(order.discount),
      total: parseFloat(order.total),
      createdAt: order.createdAt.toISOString(),
      estimatedCompletionAt: order.estimatedCompletionAt?.toISOString() || null,
    }));

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: formattedOrders,
        meta: {
          total: formattedOrders.length,
          startDate,
          endDate,
          exportedAt: new Date().toISOString(),
        },
      });
    }

    // Export to Excel
    const excelData = formatOrdersForExport(formattedOrders);
    const buffer = exportToExcel(excelData, {
      filename: `laporan-orders-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Orders",
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-orders-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Reports Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
