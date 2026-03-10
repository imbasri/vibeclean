import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizations,
  organizationMembers,
  branchPermissions,
  subscriptions,
  subscriptionInvoices,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createInvoice, isMayarConfigured, MayarError } from "@/lib/mayar";

// ============================================
// CONFIGURATION
// ============================================

const REDIRECT_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Plan pricing (sesuai PRD)
const planPricing = {
  starter: 0, // GRATIS
  pro: 149000, // Rp 149.000/bulan
  enterprise: 999000, // Custom, but we set a base price
} as const;

const planNames = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
} as const;

// ============================================
// HELPERS
// ============================================

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
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

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership[0].organizationId));

  return organization;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// ============================================
// POST /api/billing/subscribe - Create subscription payment
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return NextResponse.json(
        { error: "Only owners can manage subscription" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { plan, billingCycle = "monthly" } = body as {
      plan: "starter" | "pro" | "enterprise";
      billingCycle?: "monthly" | "yearly";
    };

    // Validate plan
    if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan specified" },
        { status: 400 }
      );
    }

    // Get organization
    const organization = await getUserOrganization(session.user.id);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Calculate price
    let price = planPricing[plan];
    if (billingCycle === "yearly") {
      price = price * 12 * 0.8; // 20% discount for yearly
    }

    // If starter (free), just activate immediately
    if (plan === "starter") {
      // Check or create subscription record
      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organization.id));

      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (existingSubscription) {
        // Update existing
        await db
          .update(subscriptions)
          .set({
            plan: "starter",
            status: "active",
            price: "0",
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existingSubscription.id));
      } else {
        // Create new
        await db.insert(subscriptions).values({
          organizationId: organization.id,
          plan: "starter",
          status: "active",
          price: "0",
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
      }

      // Update organization
      await db
        .update(organizations)
        .set({
          plan: "starter",
          subscriptionStatus: "active",
          updatedAt: now,
        })
        .where(eq(organizations.id, organization.id));

      return NextResponse.json({
        success: true,
        message: "Paket Starter telah diaktifkan!",
        requiresPayment: false,
      });
    }

    // For paid plans, create payment via Mayar
    if (!isMayarConfigured()) {
      // Development mode: activate directly
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organization.id));

      if (existingSubscription) {
        await db
          .update(subscriptions)
          .set({
            plan,
            status: "active",
            price: String(price),
            billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existingSubscription.id));
      } else {
        await db.insert(subscriptions).values({
          organizationId: organization.id,
          plan,
          status: "active",
          price: String(price),
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
      }

      await db
        .update(organizations)
        .set({
          plan,
          subscriptionStatus: "active",
          updatedAt: now,
        })
        .where(eq(organizations.id, organization.id));

      return NextResponse.json({
        success: true,
        message: `Paket ${planNames[plan]} telah diaktifkan! (Development Mode)`,
        requiresPayment: false,
      });
    }

    // Production: Create Mayar invoice
    const now = new Date();
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // 3 days to pay

    const invoiceNumber = generateInvoiceNumber();

    // Create or get subscription record
    let subscriptionRecord;
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id));

    if (existingSubscription) {
      subscriptionRecord = existingSubscription;
    } else {
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          organizationId: organization.id,
          plan: organization.plan,
          status: "trial",
          price: "0",
          billingCycle,
        })
        .returning();
      subscriptionRecord = newSubscription;
    }

    try {
      // Create Mayar invoice
      const invoice = await createInvoice({
        name: organization.name,
        email: session.user.email || `${organization.slug}@vibeclean.id`,
        mobile: "08000000000", // Should get from user profile
        redirectUrl: `${REDIRECT_URL}/dashboard/billing?success=true`,
        description: `Langganan VibeClean ${planNames[plan]} - ${billingCycle === "yearly" ? "Tahunan" : "Bulanan"}`,
        expiredAt: dueDate.toISOString(),
        items: [
          {
            quantity: 1,
            rate: price,
            description: `Paket ${planNames[plan]} (${billingCycle === "yearly" ? "Tahunan - Hemat 20%" : "Bulanan"})`,
          },
        ],
        extraData: {
          organizationId: organization.id,
          subscriptionId: subscriptionRecord.id,
          plan,
          billingCycle,
          invoiceNumber,
        },
      });

      // Create subscription invoice record
      await db.insert(subscriptionInvoices).values({
        subscriptionId: subscriptionRecord.id,
        organizationId: organization.id,
        invoiceNumber,
        amount: String(price),
        status: "pending",
        plan,
        billingCycle,
        mayarPaymentId: invoice.id,
        mayarTransactionId: invoice.transactionId,
        paymentUrl: invoice.link,
        periodStart,
        periodEnd,
        dueDate,
      });

      return NextResponse.json({
        success: true,
        message: `Invoice untuk paket ${planNames[plan]} telah dibuat`,
        requiresPayment: true,
        paymentUrl: invoice.link,
        invoiceNumber,
        amount: price,
        dueDate: dueDate.toISOString(),
      });
    } catch (error) {
      console.error("Failed to create Mayar invoice:", error);
      
      if (error instanceof MayarError) {
        return NextResponse.json(
          { error: `Payment error: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in subscribe:", error);
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/billing/subscribe - Get subscription status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await getUserOrganization(session.user.id);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id));

    if (!subscription) {
      // Return default trial info based on organization
      const trialEndsAt = organization.trialEndsAt || new Date();
      return NextResponse.json({
        subscription: {
          plan: organization.plan,
          status: organization.subscriptionStatus,
          price: planPricing[organization.plan as keyof typeof planPricing] || 0,
          billingCycle: "monthly",
          trialEndsAt: trialEndsAt.toISOString(),
          currentPeriodEnd: trialEndsAt.toISOString(),
        },
        organization: {
          id: organization.id,
          name: organization.name,
        },
      });
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        price: Number(subscription.price),
        billingCycle: subscription.billingCycle,
        trialEndsAt: subscription.trialEndsAt?.toISOString(),
        currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        monthlyOrderCount: subscription.monthlyOrderCount,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
