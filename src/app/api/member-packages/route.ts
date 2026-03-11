import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, memberPackages, memberSubscriptions, customers, branches, organizations } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

async function getUserOrganizationId(userId: string): Promise<string | null> {
  const { organizationMembers } = await import("@/lib/db");
  const membership = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return membership[0]?.organizationId || null;
}

// ============================================
// GET /api/member-packages - List all packages
// ============================================
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const packages = await db
      .select()
      .from(memberPackages)
      .where(eq(memberPackages.organizationId, organizationId))
      .orderBy(desc(memberPackages.sortOrder), desc(memberPackages.createdAt));

    return NextResponse.json(packages);
  } catch (error) {
    console.error("Error fetching member packages:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

// ============================================
// POST /api/member-packages - Create package
// ============================================
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, price, discountType, discountValue, maxWeightKg, freePickupDelivery, maxTransactionsPerMonth, isActive, sortOrder } = body;

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    const newPackage = await db
      .insert(memberPackages)
      .values({
        organizationId,
        name,
        description,
        price,
        discountType: discountType || "percentage",
        discountValue: discountValue || 0,
        maxWeightKg,
        freePickupDelivery: freePickupDelivery || false,
        maxTransactionsPerMonth,
        isActive: isActive ?? true,
        sortOrder: sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newPackage[0], { status: 201 });
  } catch (error) {
    console.error("Error creating member package:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}
