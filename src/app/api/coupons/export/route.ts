/**
 * Coupons Export API
 * 
 * Export coupons to Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, coupons, couponUsages, organizationMembers } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { formatCouponsForExport, exportToExcel } from "@/lib/export/excel";

async function getUserOrganizationId(userId: string): Promise<string | null> {
  const membership = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return membership[0]?.organizationId || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const couponList = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        type: coupons.type,
        value: coupons.value,
        minOrderAmount: coupons.minOrderAmount,
        usageLimit: coupons.usageLimit,
        usageCount: coupons.usageCount,
        validFrom: coupons.validFrom,
        validUntil: coupons.validUntil,
        isActive: coupons.isActive,
      })
      .from(coupons)
      .where(eq(coupons.organizationId, organizationId))
      .orderBy(desc(coupons.createdAt));

    const formatted = couponList.map(c => ({
      code: c.code,
      type: c.type,
      value: parseFloat(c.value),
      minOrder: c.minOrderAmount ? parseFloat(c.minOrderAmount) : null,
      maxUses: c.usageLimit,
      usedCount: c.usageCount || 0,
      validFrom: c.validFrom?.toISOString() || new Date().toISOString(),
      validUntil: c.validUntil?.toISOString() || null,
      isActive: c.isActive,
    }));

    const excelData = formatCouponsForExport(formatted);
    const buffer = exportToExcel(excelData, {
      filename: `laporan-kupon-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Kupon",
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-kupon-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Coupons Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export coupons" },
      { status: 500 }
    );
  }
}
