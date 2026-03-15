import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, organizations, subscriptions, subscriptionInvoices } from "@/lib/db";
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
// POST /api/billing/invoice/[id]/force-activate
// Force activate subscription from paid invoice
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

    const { id: invoiceId } = await params;

    // Get invoice
    const [invoice] = await db
      .select()
      .from(subscriptionInvoices)
      .where(and(
        eq(subscriptionInvoices.id, invoiceId),
        eq(subscriptionInvoices.organizationId, organizationId)
      ));

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check if invoice is paid
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { error: "Invoice belum lunas. Status: " + invoice.status },
        { status: 400 }
      );
    }

    const now = new Date();
    
    // Use period from invoice if available, otherwise calculate from now
    let periodStart = now;
    let periodEnd = new Date();
    
    if (invoice.periodEnd) {
      // Use existing period from invoice
      periodStart = new Date(invoice.periodStart || now);
      periodEnd = new Date(invoice.periodEnd);
    } else {
      // Default: 1 month from now
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Check if subscription exists
    let [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, invoice.subscriptionId));

    if (!subscription) {
      // Create new subscription from invoice
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          organizationId,
          plan: invoice.plan as any,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          billingCycle: invoice.billingCycle || "monthly",
          mayarSubscriptionId: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      subscription = newSubscription;
    } else {
      // Update existing subscription with invoice period
      await db
        .update(subscriptions)
        .set({
          status: "active",
          plan: invoice.plan as any,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          billingCycle: invoice.billingCycle || "monthly",
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));
    }

    // Update organization plan
    await db
      .update(organizations)
      .set({
        plan: invoice.plan as any,
        subscriptionStatus: "active",
        updatedAt: now,
      })
      .where(eq(organizations.id, organizationId));

    return NextResponse.json({
      success: true,
      plan: invoice.plan,
      message: `Paket ${invoice.plan} berhasil diaktifkan!`,
    });
  } catch (error) {
    console.error("Error in force-activate:", error);
    return NextResponse.json(
      { error: "Failed to activate subscription", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
