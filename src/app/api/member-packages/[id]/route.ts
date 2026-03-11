import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, memberPackages, memberSubscriptions } from "@/lib/db";
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
// PUT /api/member-packages/[id] - Update package
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, price, discountType, discountValue, maxWeightKg, freePickupDelivery, maxTransactionsPerMonth, isActive, sortOrder } = body;

    const updated = await db
      .update(memberPackages)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(maxWeightKg !== undefined && { maxWeightKg }),
        ...(freePickupDelivery !== undefined && { freePickupDelivery }),
        ...(maxTransactionsPerMonth !== undefined && { maxTransactionsPerMonth }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(memberPackages.id, id),
        eq(memberPackages.organizationId, organizationId)
      ))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating member package:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

// ============================================
// DELETE /api/member-packages/[id] - Delete package
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if there are active subscriptions
    const activeSubscriptions = await db
      .select()
      .from(memberSubscriptions)
      .where(and(
        eq(memberSubscriptions.packageId, id),
        eq(memberSubscriptions.status, "active")
      ))
      .limit(1);

    if (activeSubscriptions.length > 0) {
      // Instead of delete, just deactivate
      await db
        .update(memberPackages)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(memberPackages.id, id),
          eq(memberPackages.organizationId, organizationId)
        ));
      return NextResponse.json({ message: "Package deactivated (has active subscriptions)" });
    }

    const deleted = await db
      .delete(memberPackages)
      .where(and(
        eq(memberPackages.id, id),
        eq(memberPackages.organizationId, organizationId)
      ))
      .returning();

    if (!deleted[0]) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Package deleted" });
  } catch (error) {
    console.error("Error deleting member package:", error);
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
