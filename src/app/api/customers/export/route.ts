/**
 * Customers Export API
 * 
 * Export customers to Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, customers, organizationMembers, branches } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { formatCustomersForExport, exportToExcel } from "@/lib/export/excel";

async function getUserOrgAndBranches(userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (!member) return { orgId: null, branchIds: [] as string[] };

  const orgBranches = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.organizationId, member.organizationId));

  return {
    orgId: member.organizationId,
    branchIds: orgBranches.map(b => b.id),
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

    const { orgId } = await getUserOrgAndBranches(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const customerList = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.organizationId, orgId))
      .orderBy(desc(customers.createdAt));

    const formattedCustomers = customerList.map(c => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      totalOrders: c.totalOrders || 0,
      totalSpent: parseFloat(c.totalSpent || "0"),
      createdAt: c.createdAt.toISOString(),
    }));

    const excelData = formatCustomersForExport(formattedCustomers);
    const buffer = exportToExcel(excelData, {
      filename: `laporan-pelanggan-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Pelanggan",
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-pelanggan-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Customers Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export customers" },
      { status: 500 }
    );
  }
}
