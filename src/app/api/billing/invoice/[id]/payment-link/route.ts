/**
 * Get Invoice Payment Link API
 * 
 * Get payment URL for an existing pending invoice
 * Accepts either UUID id or invoiceNumber
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizationMembers,
  branchPermissions,
  subscriptionInvoices,
} from "@/lib/db";
import { eq, and, or } from "drizzle-orm";

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
// GET /api/billing/invoice/[id]/payment-link
// ============================================

export async function GET(
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
        { error: "Only owners can access invoice payment" },
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

    const { id: invoiceIdOrNumber } = await params;

    // Try to find by UUID first, then by invoiceNumber
    let invoice;
    const [byUuid] = await db
      .select()
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.id, invoiceIdOrNumber),
          eq(subscriptionInvoices.organizationId, organizationId)
        )
      );

    if (byUuid) {
      invoice = byUuid;
    } else {
      // Try by invoiceNumber
      const [byNumber] = await db
        .select()
        .from(subscriptionInvoices)
        .where(
          and(
            eq(subscriptionInvoices.invoiceNumber, invoiceIdOrNumber),
            eq(subscriptionInvoices.organizationId, organizationId)
          )
        );
      invoice = byNumber;
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Invoice already paid", status: "paid" },
        { status: 400 }
      );
    }

    if (!invoice.paymentUrl) {
      return NextResponse.json(
        { error: "No payment URL available for this invoice. Please contact support." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: invoice.paymentUrl,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      status: invoice.status,
    });
  } catch (error) {
    console.error("Error getting invoice payment link:", error);
    return NextResponse.json(
      { error: "Failed to get payment link" },
      { status: 500 }
    );
  }
}
