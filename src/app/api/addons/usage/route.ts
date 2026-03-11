/**
 * Add-on Usage API
 * 
 * Handles WhatsApp quota usage tracking
 * 
 * Security:
 * - Requires authentication
 * - Validates organization ownership
 * - Checks quota before allowing usage
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  addonPurchases,
  orders,
} from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

/**
 * Get user's organization ID
 */
async function getUserOrganizationId(userId: string): Promise<string | null> {
  const { organizationMembers } = await import("@/lib/db");
  
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  return member?.organizationId || null;
}

// ============================================
// GET /api/addons/usage - Get WhatsApp usage
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getUserOrganizationId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get active WhatsApp quota purchases
    const now = new Date();
    const activePurchases = await db
      .select()
      .from(addonPurchases)
      .where(
        and(
          eq(addonPurchases.organizationId, orgId),
          eq(addonPurchases.status, "active"),
          sql`${addonPurchases.endDate} > ${now}`,
          sql`${addonPurchases.whatsappQuota} > 0`
        )
      );

    const usage = activePurchases.map((p) => ({
      id: p.id,
      quota: p.whatsappQuota || 0,
      used: p.whatsappUsed || 0,
      remaining: (p.whatsappQuota || 0) - (p.whatsappUsed || 0),
      endDate: p.endDate?.toISOString(),
    }));

    const totalQuota = usage.reduce((sum, u) => sum + u.quota, 0);
    const totalUsed = usage.reduce((sum, u) => sum + u.used, 0);
    const totalRemaining = usage.reduce((sum, u) => sum + u.remaining, 0);

    return NextResponse.json({
      success: true,
      usage,
      summary: {
        totalQuota,
        totalUsed,
        totalRemaining,
        hasQuota: totalRemaining > 0,
      },
    });
  } catch (error) {
    console.error("[Addons Usage] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/addons/usage - Record WhatsApp usage
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { purchaseId, orderId, messagesSent = 1 } = body;

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
        { status: 400 }
      );
    }

    // Get purchase
    const [purchase] = await db
      .select()
      .from(addonPurchases)
      .where(eq(addonPurchases.id, purchaseId));

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // Verify organization ownership
    const orgId = await getUserOrganizationId(session.user.id);
    if (purchase.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Check if purchase is still valid
    const now = new Date();
    if (purchase.status !== "active" || !purchase.endDate || purchase.endDate < now) {
      return NextResponse.json(
        { error: "Add-on has expired or is not active" },
        { status: 400 }
      );
    }

    // Check quota
    const remaining = (purchase.whatsappQuota || 0) - (purchase.whatsappUsed || 0);
    if (remaining < messagesSent) {
      return NextResponse.json(
        { 
          error: "Insufficient WhatsApp quota",
          remaining,
          required: messagesSent,
        },
        { status: 400 }
      );
    }

    // Update usage
    const [updated] = await db
      .update(addonPurchases)
      .set({
        whatsappUsed: (purchase.whatsappUsed || 0) + messagesSent,
        updatedAt: new Date(),
      })
      .where(eq(addonPurchases.id, purchaseId))
      .returning();

    return NextResponse.json({
      success: true,
      usage: {
        quota: updated.whatsappQuota,
        used: updated.whatsappUsed,
        remaining: (updated.whatsappQuota || 0) - (updated.whatsappUsed || 0),
      },
    });
  } catch (error) {
    console.error("[Addons Usage] POST error:", error);
    return NextResponse.json(
      { error: "Failed to record usage" },
      { status: 500 }
    );
  }
}
