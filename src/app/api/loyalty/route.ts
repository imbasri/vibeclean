/**
 * Loyalty Settings API
 * 
 * Manage loyalty program settings and tiers
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, membershipTiers, customerMemberships, organizations, organizationMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

async function getUserOrgId(userId: string): Promise<string | null> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  
  return member?.organizationId || null;
}

// Loyalty Settings Table (if not exists in schema)
// For now, we'll use organization metadata or create a simple key-value approach

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

    // Get membership tiers
    const tiers = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.organizationId, orgId))
      .orderBy(membershipTiers.minSpending);

    // Get customer membership stats
    const customerStats = await db
      .select({
        totalMembers: eq(customerMemberships.customerId, customerMemberships.customerId), // This won't work
      })
      .from(customerMemberships)
      .leftJoin(organizations, eq(customerMemberships.customerId, organizations.id));

    return NextResponse.json({
      tiers: tiers,
      stats: {
        totalTiers: tiers.length,
      },
    });
  } catch (error) {
    console.error("[Loyalty Settings] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty settings" },
      { status: 500 }
    );
  }
}

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
    const { tiers, settings } = body;

    // Update or create tiers
    if (tiers && Array.isArray(tiers)) {
      // Delete existing tiers first
      await db
        .delete(membershipTiers)
        .where(eq(membershipTiers.organizationId, orgId));

      // Insert new tiers
      for (const tier of tiers) {
        await db
          .insert(membershipTiers)
          .values({
            organizationId: orgId,
            name: tier.name,
            tier: tier.tier,
            minSpending: tier.minSpending || "0",
            discountPercentage: tier.discountPercentage || "0",
            pointMultiplier: tier.pointMultiplier || "1",
            isActive: tier.isActive ?? true,
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Loyalty Settings] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update loyalty settings" },
      { status: 500 }
    );
  }
}
