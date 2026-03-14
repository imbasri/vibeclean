import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, memberSubscriptions } from "@/lib/db";
import { eq, and } from "drizzle-orm";

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
// PATCH /api/member-packages/subscriptions/[id] - Cancel subscription
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { id: subscriptionId } = await params;

    // Find subscription
    const [subscription] = await db
      .select()
      .from(memberSubscriptions)
      .where(and(
        eq(memberSubscriptions.id, subscriptionId),
        eq(memberSubscriptions.organizationId, organizationId)
      ));

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Update status to cancelled
    await db
      .update(memberSubscriptions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(memberSubscriptions.id, subscriptionId));

    return NextResponse.json({ 
      success: true, 
      message: "Subscription cancelled successfully" 
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/member-packages/subscriptions/[id]/renew - Renew subscription
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { id: subscriptionId } = await params;

    // Find subscription
    const [subscription] = await db
      .select()
      .from(memberSubscriptions)
      .where(and(
        eq(memberSubscriptions.id, subscriptionId),
        eq(memberSubscriptions.organizationId, organizationId)
      ));

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Extend subscription by 1 month
    const newEndDate = new Date(subscription.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    await db
      .update(memberSubscriptions)
      .set({
        status: "active",
        endDate: newEndDate,
        transactionsThisMonth: 0,
        lastTransactionReset: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memberSubscriptions.id, subscriptionId));

    return NextResponse.json({ 
      success: true, 
      message: "Subscription renewed successfully",
      newEndDate: newEndDate.toISOString(),
    });
  } catch (error) {
    console.error("Error renewing subscription:", error);
    return NextResponse.json(
      { error: "Failed to renew subscription" },
      { status: 500 }
    );
  }
}
