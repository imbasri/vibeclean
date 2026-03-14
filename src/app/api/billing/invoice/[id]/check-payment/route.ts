/**
 * Check Invoice Payment Status API
 * 
 * Check payment status with Mayar and update local database
 * Also activates subscription when payment is confirmed
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
import { getInvoiceStatus, MayarError } from "@/lib/mayar";

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
// POST /api/billing/invoice/[id]/check-payment
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
        { error: "Only owners can check payment status" },
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

    // If already paid in local DB, return success
    if (invoice.status === "paid") {
      return NextResponse.json({
        success: true,
        paid: true,
        invoiceNumber: invoice.invoiceNumber,
        message: "Invoice sudah lunas",
      });
    }

    // Check if there's a Mayar payment ID
    if (!invoice.mayarPaymentId) {
      return NextResponse.json(
        { error: "Tidak ada payment ID untuk invoice ini" },
        { status: 400 }
      );
    }

    try {
      // Check payment status with Mayar
      const mayarStatus = await getInvoiceStatus(invoice.mayarPaymentId);

      // Update local database if paid
      if (mayarStatus.isPaid) {
        // 1. Update invoice status to paid
        await db
          .update(subscriptionInvoices)
          .set({
            status: "paid",
            paidAt: mayarStatus.paidAt ? new Date(mayarStatus.paidAt) : new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptionInvoices.id, invoiceId));

        // 2. Activate subscription
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

          // 3. Update organization plan
          await db
            .update(organizations)
            .set({
              plan: subscription.plan,
              subscriptionStatus: "active",
              updatedAt: now,
            })
            .where(eq(organizations.id, invoice.organizationId));
        }

        return NextResponse.json({
          success: true,
          paid: true,
          invoiceNumber: invoice.invoiceNumber,
          message: "Pembayaran berhasil dikonfirmasi!",
        });
      }

      // Not paid yet
      return NextResponse.json({
        success: true,
        paid: false,
        invoiceNumber: invoice.invoiceNumber,
        mayarStatus: mayarStatus.status,
        message: `Status pembayaran: ${mayarStatus.status}`,
      });
    } catch (error) {
      console.error("Error checking Mayar payment:", error);

      if (error instanceof MayarError) {
        // If Mayar API error, still return success but note the issue
        return NextResponse.json({
          success: true,
          paid: false,
          invoiceNumber: invoice.invoiceNumber,
          error: `Tidak dapat memeriksa status: ${error.message}`,
          manualAction: "Silakan hubungi customer service atau lakukan pembayaran ulang",
        });
      }

      return NextResponse.json(
        { error: "Gagal memeriksa status pembayaran" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in check-payment:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
