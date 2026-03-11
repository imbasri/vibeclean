import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, memberPackages, memberSubscriptions, customers } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";

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
// GET /api/member-packages/subscriptions - List subscriptions
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    let subscriptions;

    if (status && customerId) {
      subscriptions = await db
        .select({
          id: memberSubscriptions.id,
          organizationId: memberSubscriptions.organizationId,
          branchId: memberSubscriptions.branchId,
          customerId: memberSubscriptions.customerId,
          packageId: memberSubscriptions.packageId,
          status: memberSubscriptions.status,
          startDate: memberSubscriptions.startDate,
          endDate: memberSubscriptions.endDate,
          autoRenew: memberSubscriptions.autoRenew,
          transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
          lastTransactionReset: memberSubscriptions.lastTransactionReset,
          notes: memberSubscriptions.notes,
          createdAt: memberSubscriptions.createdAt,
          customerName: customers.name,
          customerPhone: customers.phone,
          packageName: memberPackages.name,
          packagePrice: memberPackages.price,
          packageDiscountType: memberPackages.discountType,
          packageDiscountValue: memberPackages.discountValue,
        })
        .from(memberSubscriptions)
        .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
        .innerJoin(customers, eq(memberSubscriptions.customerId, customers.id))
        .where(and(
          eq(memberSubscriptions.organizationId, organizationId),
          eq(memberSubscriptions.status, status as any),
          eq(memberSubscriptions.customerId, customerId)
        ))
        .orderBy(desc(memberSubscriptions.createdAt));
    } else if (status) {
      subscriptions = await db
        .select({
          id: memberSubscriptions.id,
          organizationId: memberSubscriptions.organizationId,
          branchId: memberSubscriptions.branchId,
          customerId: memberSubscriptions.customerId,
          packageId: memberSubscriptions.packageId,
          status: memberSubscriptions.status,
          startDate: memberSubscriptions.startDate,
          endDate: memberSubscriptions.endDate,
          autoRenew: memberSubscriptions.autoRenew,
          transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
          lastTransactionReset: memberSubscriptions.lastTransactionReset,
          notes: memberSubscriptions.notes,
          createdAt: memberSubscriptions.createdAt,
          customerName: customers.name,
          customerPhone: customers.phone,
          packageName: memberPackages.name,
          packagePrice: memberPackages.price,
          packageDiscountType: memberPackages.discountType,
          packageDiscountValue: memberPackages.discountValue,
        })
        .from(memberSubscriptions)
        .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
        .innerJoin(customers, eq(memberSubscriptions.customerId, customers.id))
        .where(and(
          eq(memberSubscriptions.organizationId, organizationId),
          eq(memberSubscriptions.status, status as any)
        ))
        .orderBy(desc(memberSubscriptions.createdAt));
    } else if (customerId) {
      subscriptions = await db
        .select({
          id: memberSubscriptions.id,
          organizationId: memberSubscriptions.organizationId,
          branchId: memberSubscriptions.branchId,
          customerId: memberSubscriptions.customerId,
          packageId: memberSubscriptions.packageId,
          status: memberSubscriptions.status,
          startDate: memberSubscriptions.startDate,
          endDate: memberSubscriptions.endDate,
          autoRenew: memberSubscriptions.autoRenew,
          transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
          lastTransactionReset: memberSubscriptions.lastTransactionReset,
          notes: memberSubscriptions.notes,
          createdAt: memberSubscriptions.createdAt,
          customerName: customers.name,
          customerPhone: customers.phone,
          packageName: memberPackages.name,
          packagePrice: memberPackages.price,
          packageDiscountType: memberPackages.discountType,
          packageDiscountValue: memberPackages.discountValue,
        })
        .from(memberSubscriptions)
        .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
        .innerJoin(customers, eq(memberSubscriptions.customerId, customers.id))
        .where(and(
          eq(memberSubscriptions.organizationId, organizationId),
          eq(memberSubscriptions.customerId, customerId)
        ))
        .orderBy(desc(memberSubscriptions.createdAt));
    } else {
      subscriptions = await db
        .select({
          id: memberSubscriptions.id,
          organizationId: memberSubscriptions.organizationId,
          branchId: memberSubscriptions.branchId,
          customerId: memberSubscriptions.customerId,
          packageId: memberSubscriptions.packageId,
          status: memberSubscriptions.status,
          startDate: memberSubscriptions.startDate,
          endDate: memberSubscriptions.endDate,
          autoRenew: memberSubscriptions.autoRenew,
          transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
          lastTransactionReset: memberSubscriptions.lastTransactionReset,
          notes: memberSubscriptions.notes,
          createdAt: memberSubscriptions.createdAt,
          customerName: customers.name,
          customerPhone: customers.phone,
          packageName: memberPackages.name,
          packagePrice: memberPackages.price,
          packageDiscountType: memberPackages.discountType,
          packageDiscountValue: memberPackages.discountValue,
        })
        .from(memberSubscriptions)
        .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
        .innerJoin(customers, eq(memberSubscriptions.customerId, customers.id))
        .where(eq(memberSubscriptions.organizationId, organizationId))
        .orderBy(desc(memberSubscriptions.createdAt));
    }

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Error fetching member subscriptions:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

// ============================================
// POST /api/member-packages/subscriptions - Create subscription
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
    const { customerId, packageId, branchId, startDate, endDate, autoRenew, notes } = body;

    if (!customerId || !packageId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check package exists
    const pkg = await db
      .select()
      .from(memberPackages)
      .where(and(eq(memberPackages.id, packageId), eq(memberPackages.organizationId, organizationId)))
      .limit(1);

    if (!pkg[0]) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Check customer exists and belongs to org
    const customer = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .limit(1);

    if (!customer[0]) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const newSubscription = await db
      .insert(memberSubscriptions)
      .values({
        organizationId,
        branchId,
        customerId,
        packageId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        autoRenew: autoRenew ?? true,
        notes,
        status: "active",
      })
      .returning();

    return NextResponse.json(newSubscription[0], { status: 201 });
  } catch (error) {
    console.error("Error creating member subscription:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
