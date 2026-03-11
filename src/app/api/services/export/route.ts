/**
 * Services Export API
 * 
 * Export laundry services to Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, services, organizationMembers, branches } from "@/lib/db";
import { eq, inArray, desc } from "drizzle-orm";
import { formatServicesForExport, exportToExcel } from "@/lib/export/excel";

interface BranchInfo {
  id: string;
  name: string;
}

async function getUserOrgAndBranches(userId: string): Promise<{
  orgId: string | null;
  branchIds: string[];
  branches: BranchInfo[];
}> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (!member) {
    return { orgId: null, branchIds: [], branches: [] };
  }

  const orgBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.organizationId, member.organizationId));

  return {
    orgId: member.organizationId,
    branchIds: orgBranches.map(b => b.id),
    branches: orgBranches,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, branches, branchIds } = await getUserOrgAndBranches(session.user.id);
    
    if (!orgId || branchIds.length === 0) {
      return NextResponse.json({ error: "No branches accessible" }, { status: 403 });
    }

    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    const serviceList = await db
      .select({
        id: services.id,
        name: services.name,
        category: services.category,
        unit: services.unit,
        price: services.price,
        estimatedDays: services.estimatedDays,
        isActive: services.isActive,
        branchId: services.branchId,
      })
      .from(services)
      .where(inArray(services.branchId, branchIds))
      .orderBy(desc(services.createdAt));

    const formattedServices = serviceList.map(s => ({
      name: s.name,
      category: s.category,
      unit: s.unit,
      price: parseFloat(s.price),
      estimatedDays: s.estimatedDays,
      isActive: s.isActive,
      branchName: branchMap.get(s.branchId) || "Unknown",
    }));

    const excelData = formatServicesForExport(formattedServices);
    const buffer = exportToExcel(excelData, {
      filename: `laporan-layanan-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Layanan",
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-layanan-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Services Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export services" },
      { status: 500 }
    );
  }
}
