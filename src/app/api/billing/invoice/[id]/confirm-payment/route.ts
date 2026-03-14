/**
 * Confirm Payment & Activate API
 * 
 * Manually confirm payment and activate subscription
 * Bypasses Mayar verification - use when payment already made
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizationMembers,
  branchPermissions,
  subscriptionInvoices,
  subscriptions,
  organizations,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

async function getUserOrganization(userId: string) {
  const membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  if (!membership[0]?.organizationId) {
    return null;
  }

  return membership[0].organizationId;
}

async function isOwner(userId: string): Promise<boolean> {
  const permissions = await db
    .select({
      role: branchPermissions.role,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(eq(organizationMembers.userId, userId));

  return permissions.some((p) => p.role === "owner");
}

// ============================================
// POST /api/billing/invoice/[id]/confirm-payment
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

    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return NextResponse.json(
        { error: "Only owners can confirm payment" },
        { status: 403 }
      );
    }

    const organizationId = await getUserOrganization(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { id: invoiceId } = await params;

    // Get invoice from database
    const [invoice] = await db
      .select()
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.id, invoiceId),
          eq(subscriptionInvoices.organizationId, organizationId)
        )
      );

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // If already paid, just activate
    if (invoice.status === "paid") {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId));

      if (subscription) {
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + (subscription.billingCycle === "yearly" ? 12 : 1));

        await db
          .update(subscriptions)
          .set({
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, subscription.id));

        await db
          .update(organizations)
          .set({
            plan: subscription.plan,
            subscriptionStatus: "active",
            updatedAt: now,
          })
          .where(eq(organizations.id, organizationId));

        return NextResponse.json({
          success: true,
          plan: subscription.plan,
          message: `Paket ${subscription.plan} berhasil diaktifkan!`,
        });
      }
    }

    // Mark as paid and activate
    const now = new Date();
    
    // 1. Update invoice to paid
    await db
      .update(subscriptionInvoices)
      .set({
        status: "paid",
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(subscriptionInvoices.id, invoiceId));

    // 2. Get and update subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, invoice.subscriptionId));

    if (subscription) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (subscription.billingCycle === "yearly" ? 12 : 1));

      await db
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));

      // 3. Update organization
      await db
        .update(organizations)
        .set({
          plan: subscription.plan,
          subscriptionStatus: "active",
          updatedAt: now,
        })
        .where(eq(organizations.id, organizationId));

      return NextResponse.json({
        success: true,
        plan: subscription.plan,
        message: `Pembayaran dikonfirmasi! Paket ${subscription.plan} diaktifkan.`,
      });
    }

    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in confirm-payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
