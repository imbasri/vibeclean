/**
 * Add-ons API
 * 
 * Handles:
 * - Listing available add-ons
 * - Purchasing add-ons
 * - Managing organization's add-ons
 * - Usage tracking for WhatsApp quota
 * 
 * Security:
 * - All endpoints require authentication
 * - Admin-only endpoints for product management
 * - Payment validation before activation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isSuperAdmin } from "@/lib/admin";
import {
  db,
  organizations,
  addonProducts,
  addonPurchases,
} from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user's organization ID
 */
async function getUserOrganizationId(userId: string): Promise<string | null> {
  const { organizationMembers, users } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  return member?.organizationId || null;
}

// ============================================
// GET /api/addons - List available add-ons
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "custom_domain" | "whatsapp_quota" | null
    const includeInactive = searchParams.get("includeInactive") === "true";
    const isAdmin = isSuperAdmin(session.user.email);

    // Build query
    let query = db.select().from(addonProducts);

    if (type) {
      query = query.where(eq(addonProducts.type, type as any)) as typeof query;
    }

    if (!includeInactive && !isAdmin) {
      query = query.where(eq(addonProducts.isActive, true)) as typeof query;
    }

    const products = await query.orderBy(desc(addonProducts.createdAt));

    // If user is logged in, also get their purchases
    let purchases: any[] = [];
    const orgId = await getUserOrganizationId(session.user.id);
    
    if (orgId) {
      purchases = await db
        .select()
        .from(addonPurchases)
        .where(eq(addonPurchases.organizationId, orgId))
        .orderBy(desc(addonPurchases.createdAt));
    }

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        description: p.description,
        price: p.price,
        durationDays: p.durationDays,
        quota: p.quota,
        isActive: p.isActive,
      })),
      purchases: purchases.map((p) => ({
        id: p.id,
        productId: p.productId,
        status: p.status,
        startDate: p.startDate?.toISOString(),
        endDate: p.endDate?.toISOString(),
        customDomain: p.customDomain,
        customDomainVerified: p.customDomainVerified,
        customDomainVerifiedAt: p.customDomainVerifiedAt?.toISOString(),
        whatsappQuota: p.whatsappQuota,
        whatsappUsed: p.whatsappUsed,
      })),
    });
  } catch (error) {
    console.error("[Addons] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch add-ons" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/addons - Admin: Create/Update add-on product
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can manage products
    if (!isSuperAdmin(session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "create") {
      // Create new add-on product
      const [product] = await db
        .insert(addonProducts)
        .values({
          type: data.type,
          name: data.name,
          description: data.description,
          price: data.price,
          durationDays: data.durationDays,
          quota: data.quota || null,
          isActive: data.isActive ?? true,
        })
        .returning();

      return NextResponse.json({
        success: true,
        product,
      });
    }

    if (action === "update" && data.id) {
      // Update existing product
      const [product] = await db
        .update(addonProducts)
        .set({
          name: data.name,
          description: data.description,
          price: data.price,
          durationDays: data.durationDays,
          quota: data.quota || null,
          isActive: data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(addonProducts.id, data.id))
        .returning();

      return NextResponse.json({
        success: true,
        product,
      });
    }

    if (action === "toggle" && data.id) {
      // Toggle product active status
      const [existing] = await db
        .select()
        .from(addonProducts)
        .where(eq(addonProducts.id, data.id));

      if (!existing) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const [product] = await db
        .update(addonProducts)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(addonProducts.id, data.id))
        .returning();

      return NextResponse.json({
        success: true,
        product,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Addons] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
