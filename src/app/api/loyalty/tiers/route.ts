/**
 * Membership Tiers API
 * 
 * Manage membership tiers for loyalty program
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, membershipTiers, organizationMembers, customers, customerMemberships } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";

async function getUserOrgId(userId: string): Promise<string | null> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  
  return member?.organizationId || null;
}

// GET - List all tiers
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getUserOrgId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get("includeStats") === "true";

    // Get tiers
    const tiers = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.organizationId, orgId))
      .orderBy(membershipTiers.minSpending);

    // Optionally include stats
    if (includeStats) {
      // Get customer count per tier
      const tierStats = await db
        .select({
          tierId: customerMemberships.tierId,
          count: sql<number>`COUNT(*)`,
          totalPoints: sql<string>`COALESCE(SUM(${customerMemberships.points}), 0)`,
          totalSpent: sql<string>`COALESCE(SUM(${customerMemberships.totalSpent}), 0)`,
        })
        .from(customerMemberships)
        .groupBy(customerMemberships.tierId);

      return NextResponse.json({ tiers, stats: tierStats });
    }

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("[Membership Tiers] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership tiers" },
      { status: 500 }
    );
  }
}

// POST - Create a new tier
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getUserOrgId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, tier, minSpending, discountPercentage, pointMultiplier, isActive } = body;

    // Check if tier already exists for this org
    const existing = await db
      .select()
      .from(membershipTiers)
      .where(
        and(
          eq(membershipTiers.organizationId, orgId),
          eq(membershipTiers.tier, tier)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Tier already exists" },
        { status: 400 }
      );
    }

    const [newTier] = await db
      .insert(membershipTiers)
      .values({
        organizationId: orgId,
        name,
        tier,
        minSpending: minSpending || "0",
        discountPercentage: discountPercentage || "0",
        pointMultiplier: pointMultiplier || "1",
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json(newTier);
  } catch (error) {
    console.error("[Membership Tiers] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create membership tier" },
      { status: 500 }
    );
  }
}

// PUT - Update a tier
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getUserOrgId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { id, name, minSpending, discountPercentage, pointMultiplier, isActive } = body;

    const [updatedTier] = await db
      .update(membershipTiers)
      .set({
        name,
        minSpending: minSpending || "0",
        discountPercentage: discountPercentage || "0",
        pointMultiplier: pointMultiplier || "1",
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(membershipTiers.id, id))
      .returning();

    if (!updatedTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTier);
  } catch (error) {
    console.error("[Membership Tiers] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update membership tier" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tier
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Tier ID required" }, { status: 400 });
    }

    await db
      .delete(membershipTiers)
      .where(eq(membershipTiers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Membership Tiers] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete membership tier" },
      { status: 500 }
    );
  }
}
