import { NextRequest, NextResponse } from "next/server";
import { db, subscriptions, organizations } from "@/lib/db";
import { eq } from "drizzle-orm";

// Manual activation endpoint - for admin/founder use
// POST /api/admin/activate-subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, plan = "pro" } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 12); // 1 year for testing

    // Check existing subscription
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));

    let subscription;

    if (existingSub) {
      // Update existing
      await db
        .update(subscriptions)
        .set({
          plan: plan as any,
          status: "active",
          price: plan === "pro" ? "149000" : plan === "enterprise" ? "999000" : "0",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existingSub.id));
      
      subscription = { ...existingSub, plan, status: "active" };
    } else {
      // Create new
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          organizationId,
          plan: plan as any,
          status: "active",
          price: plan === "pro" ? "149000" : plan === "enterprise" ? "999000" : "0",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();
      
      subscription = newSub;
    }

    // Update organization
    await db
      .update(organizations)
      .set({
        plan: plan as any,
        subscriptionStatus: "active",
        updatedAt: now,
      })
      .where(eq(organizations.id, organizationId));

    return NextResponse.json({
      success: true,
      message: `Subscription activated: ${plan}`,
      subscription,
    });
  } catch (error) {
    console.error("Error activating subscription:", error);
    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    );
  }
}
