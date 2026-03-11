/**
 * Member Packages Export API
 * 
 * Export member packages and subscriptions to Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, memberPackages, memberSubscriptions, customers, organizationMembers } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { 
  formatMemberPackagesForExport, 
  formatMemberSubscriptionsForExport,
  exportToExcel 
} from "@/lib/export/excel";

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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "packages"; // packages or subscriptions

    const organizationId = await getUserOrganizationId(session.user.id);
    
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let buffer: Buffer;

    if (type === "subscriptions") {
      const subscriptions = await db
        .select({
          id: memberSubscriptions.id,
          customerId: memberSubscriptions.customerId,
          packageId: memberSubscriptions.packageId,
          status: memberSubscriptions.status,
          startDate: memberSubscriptions.startDate,
          endDate: memberSubscriptions.endDate,
          transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
          customerName: customers.name,
          customerPhone: customers.phone,
          packageName: memberPackages.name,
        })
        .from(memberSubscriptions)
        .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
        .innerJoin(customers, eq(memberSubscriptions.customerId, customers.id))
        .where(eq(memberSubscriptions.organizationId, organizationId))
        .orderBy(desc(memberSubscriptions.createdAt));

      const formatted = subscriptions.map(s => ({
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        packageName: s.packageName,
        status: s.status,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        transactionsThisMonth: s.transactionsThisMonth || 0,
      }));

      const excelData = formatMemberSubscriptionsForExport(formatted);
      buffer = exportToExcel(excelData, {
        filename: `laporan-member-subscriptions-${new Date().toISOString().split("T")[0]}`,
        sheetName: "Langganan Member",
      });
    } else {
      const packages = await db
        .select()
        .from(memberPackages)
        .where(eq(memberPackages.organizationId, organizationId))
        .orderBy(desc(memberPackages.sortOrder));

      const formatted = packages.map(p => ({
        name: p.name,
        description: p.description,
        price: p.price,
        discountType: p.discountType,
        discountValue: p.discountValue,
        maxWeightKg: p.maxWeightKg,
        freePickupDelivery: p.freePickupDelivery || false,
        maxTransactionsPerMonth: p.maxTransactionsPerMonth,
        isActive: p.isActive ?? false,
      }));

      const excelData = formatMemberPackagesForExport(formatted);
      buffer = exportToExcel(excelData, {
        filename: `laporan-member-packages-${new Date().toISOString().split("T")[0]}`,
        sheetName: "Paket Member",
      });
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-member-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Member Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export member data" },
      { status: 500 }
    );
  }
}
