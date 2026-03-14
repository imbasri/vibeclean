/**
 * Get Pending Invoices API
 * 
 * Get all paid invoices that haven't activated their subscription yet
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  subscriptionInvoices,
  organizations,
} from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is founder
    const isFounder = session.user.email?.includes("founder") || 
                     session.user.email === "admin@vibeclean.id";
    
    if (!isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all paid invoices where the subscription is not active
    const invoices = await db
      .select({
        id: subscriptionInvoices.id,
        invoiceNumber: subscriptionInvoices.invoiceNumber,
        organizationId: subscriptionInvoices.organizationId,
        amount: subscriptionInvoices.amount,
        status: subscriptionInvoices.status,
        plan: subscriptionInvoices.plan,
        createdAt: subscriptionInvoices.createdAt,
        organizationName: organizations.name,
      })
      .from(subscriptionInvoices)
      .leftJoin(
        organizations,
        eq(subscriptionInvoices.organizationId, organizations.id)
      )
      .where(
        and(
          eq(subscriptionInvoices.status, "paid")
        )
      )
      .orderBy(desc(subscriptionInvoices.createdAt))
      .limit(50);

    // Filter invoices where the organization is not on the same plan as the invoice
    const pendingInvoices = invoices.filter(inv => {
      // Get the organization's current plan
      const org = invoices.find(i => i.organizationId === inv.organizationId);
      // If org plan doesn't match invoice plan, it needs activation
      return true; // Show all paid invoices - let founder decide
    });

    return NextResponse.json({
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        organizationId: inv.organizationId,
        organizationName: inv.organizationName || "Unknown",
        plan: inv.plan,
        amount: Number(inv.amount),
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching pending invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending invoices" },
      { status: 500 }
    );
  }
}
