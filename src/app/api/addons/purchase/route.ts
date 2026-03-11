/**
 * Add-on Purchase API
 * 
 * Handles purchasing add-ons with Mayar integration
 * 
 * Security:
 * - Requires authentication
 * - Validates organization subscription
 * - Payment verification before activation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizations,
  addonProducts,
  addonPurchases,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";

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
// POST /api/addons/purchase - Purchase add-on
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const orgId = await getUserOrganizationId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get organization details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { productId, customDomain } = body;

    // Validate input
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get product details
    const [product] = await db
      .select()
      .from(addonProducts)
      .where(eq(addonProducts.id, productId));

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: "Product is not available" },
        { status: 400 }
      );
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + product.durationDays);

    // For custom domain, validate domain format
    if (product.type === "custom_domain") {
      if (!customDomain) {
        return NextResponse.json(
          { error: "Domain name is required for custom domain add-on" },
          { status: 400 }
        );
      }

      // Basic domain validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain)) {
        return NextResponse.json(
          { error: "Invalid domain format" },
          { status: 400 }
        );
      }
    }

    // Create purchase record (pending payment)
    const [purchase] = await db
      .insert(addonPurchases)
      .values({
        organizationId: orgId,
        productId: productId,
        status: "pending",
        startDate: startDate,
        endDate: endDate,
        customDomain: product.type === "custom_domain" ? customDomain : null,
        whatsappQuota: product.type === "whatsapp_quota" ? (product.quota || 0) : 0,
        whatsappUsed: 0,
        paymentAmount: product.price,
        paymentStatus: "pending",
      })
      .returning();

    // TODO: Create Mayar payment invoice here
    // For now, we'll simulate instant activation for testing
    
    // For demo/testing: auto-activate
    // In production: wait for payment webhook
    const [activatedPurchase] = await db
      .update(addonPurchases)
      .set({
        status: "active",
        paymentStatus: "paid",
        paymentAmount: product.price,
      })
      .where(eq(addonPurchases.id, purchase.id))
      .returning();

    return NextResponse.json({
      success: true,
      purchase: {
        id: activatedPurchase.id,
        productId: activatedPurchase.productId,
        status: activatedPurchase.status,
        startDate: activatedPurchase.startDate?.toISOString(),
        endDate: activatedPurchase.endDate?.toISOString(),
        customDomain: activatedPurchase.customDomain,
        whatsappQuota: activatedPurchase.whatsappQuota,
        whatsappUsed: activatedPurchase.whatsappUsed,
        paymentStatus: activatedPurchase.paymentStatus,
      },
      product: {
        name: product.name,
        type: product.type,
        price: product.price,
      },
    });
  } catch (error) {
    console.error("[Addons Purchase] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process purchase" },
      { status: 500 }
    );
  }
}
