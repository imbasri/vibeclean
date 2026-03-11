/**
 * Staff Export API
 * 
 * Export staff members to Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, users, organizationMembers, branchPermissions, branches } from "@/lib/db";
import { eq, inArray, desc, sql } from "drizzle-orm";
import { formatStaffForExport, exportToExcel } from "@/lib/export/excel";

async function getUserOrgAndBranches(userId: string) {
  const memberships = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  if (!memberships[0]) return { orgId: null, branchIds: [] as string[] };

  const orgBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.organizationId, memberships[0].organizationId));

  return {
    orgId: memberships[0].organizationId,
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

    const { orgId, branches } = await getUserOrgAndBranches(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    const staffMembers = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        branchId: branchPermissions.branchId,
        role: branchPermissions.role,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .leftJoin(branchPermissions, eq(branchPermissions.memberId, organizationMembers.id))
      .where(eq(organizationMembers.organizationId, orgId))
      .orderBy(desc(users.createdAt));

    const formattedStaff = staffMembers.map(s => ({
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role || "cashier",
      branchName: s.branchId ? (branchMap.get(s.branchId) || "Unknown") : "-",
      isActive: true,
      createdAt: s.createdAt.toISOString(),
    }));

    const excelData = formatStaffForExport(formattedStaff);
    const buffer = exportToExcel(excelData, {
      filename: `laporan-karyawan-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Karyawan",
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-karyawan-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Staff Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export staff" },
      { status: 500 }
    );
  }
}
