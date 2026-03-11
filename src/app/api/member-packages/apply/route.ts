import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, memberSubscriptions, memberPackages, customers, branches } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

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
// POST /api/member-packages/apply - Apply member discount
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
    const { customerId, branchId, weight } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const now = new Date();

    // Find active subscription for this customer
    const subscription = await db
      .select({
        id: memberSubscriptions.id,
        packageId: memberSubscriptions.packageId,
        endDate: memberSubscriptions.endDate,
        transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
        lastTransactionReset: memberSubscriptions.lastTransactionReset,
        name: memberPackages.name,
        price: memberPackages.price,
        discountType: memberPackages.discountType,
        discountValue: memberPackages.discountValue,
        maxWeightKg: memberPackages.maxWeightKg,
        freePickupDelivery: memberPackages.freePickupDelivery,
        maxTransactionsPerMonth: memberPackages.maxTransactionsPerMonth,
      })
      .from(memberSubscriptions)
      .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
      .where(and(
        eq(memberSubscriptions.customerId, customerId),
        eq(memberSubscriptions.organizationId, organizationId),
        eq(memberSubscriptions.status, "active"),
        sql`${memberSubscriptions.endDate} >= ${now}`
      ))
      .limit(1);

    if (!subscription[0]) {
      return NextResponse.json({ 
        eligible: false, 
        message: "No active member subscription" 
      });
    }

    const sub = subscription[0];
    const pkg = {
      name: sub.name,
      price: sub.price,
      discountType: sub.discountType,
      discountValue: sub.discountValue,
      maxWeightKg: sub.maxWeightKg,
      freePickupDelivery: sub.freePickupDelivery,
      maxTransactionsPerMonth: sub.maxTransactionsPerMonth,
    };

    // Check transaction limit
    const currentTransactions = sub.transactionsThisMonth || 0;
    if (pkg.maxTransactionsPerMonth && currentTransactions >= pkg.maxTransactionsPerMonth) {
      return NextResponse.json({ 
        eligible: false, 
        message: `Monthly transaction limit (${pkg.maxTransactionsPerMonth}) reached` 
      });
    }

    // Check weight limit
    if (pkg.maxWeightKg && weight && weight > pkg.maxWeightKg) {
      return NextResponse.json({ 
        eligible: false, 
        message: `Weight exceeds member package limit (${pkg.maxWeightKg}kg)`,
        maxWeightKg: pkg.maxWeightKg 
      });
    }

    // Return discount info
    return NextResponse.json({
      eligible: true,
      subscriptionId: sub.id,
      packageName: pkg.name,
      discountType: pkg.discountType,
      discountValue: pkg.discountValue,
      freePickupDelivery: pkg.freePickupDelivery,
      remainingTransactions: pkg.maxTransactionsPerMonth 
        ? pkg.maxTransactionsPerMonth - currentTransactions
        : null,
    });

  } catch (error) {
    console.error("Error applying member discount:", error);
    return NextResponse.json({ error: "Failed to apply member discount" }, { status: 500 });
  }
}

// ============================================
// POST /api/member-packages/record - Record transaction
// ============================================
export async function PUT(request: NextRequest) {
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
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get current subscription
    const subscription = await db
      .select()
      .from(memberSubscriptions)
      .where(eq(memberSubscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription[0]) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const sub = subscription[0];
    let currentCount = sub.transactionsThisMonth || 0;
    let lastReset = sub.lastTransactionReset ? new Date(sub.lastTransactionReset) : startOfMonth;

    // Reset counter if new month
    if (lastReset < startOfMonth) {
      currentCount = 0;
      lastReset = now;
    }

    // Update transaction count
    await db
      .update(memberSubscriptions)
      .set({
        transactionsThisMonth: currentCount + 1,
        lastTransactionReset: lastReset,
        updatedAt: now,
      })
      .where(eq(memberSubscriptions.id, subscriptionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording member transaction:", error);
    return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
  }
}
