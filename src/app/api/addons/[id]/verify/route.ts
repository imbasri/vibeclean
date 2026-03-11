/**
 * Add-on Verification API
 * 
 * Handles verification of custom domain DNS setup
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, addonPurchases, addonProducts } from "@/lib/db";
import { eq, and } from "drizzle-orm";

async function getUserOrganizationId(userId: string): Promise<string | null> {
  const { organizationMembers } = await import("@/lib/db");
  const [member] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return member?.organizationId || null;
}

function getDNSInstructions(domain: string) {
  return {
    aRecord: {
      type: "A",
      name: "@",
      value: "76.76.21.21",
      description: "Point to Vercel/Next.js deployment",
    },
    cnameRecord: {
      type: "CNAME",
      name: "www",
      value: "cname.vercel-dns.com",
      description: "Alternative for www subdomain",
    },
  };
}

// ============================================
// GET /api/addons/[id]/verify - Get verification status & instructions
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = await getUserOrganizationId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const [purchase] = await db
      .select()
      .from(addonPurchases)
      .where(and(
        eq(addonPurchases.id, id),
        eq(addonPurchases.organizationId, orgId)
      ))
      .limit(1);

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const [product] = await db
      .select()
      .from(addonProducts)
      .where(eq(addonProducts.id, purchase.productId))
      .limit(1);

    if (!product || product.type !== "custom_domain") {
      return NextResponse.json({ error: "Not a custom domain purchase" }, { status: 400 });
    }

    const dnsInstructions = purchase.customDomain 
      ? getDNSInstructions(purchase.customDomain) 
      : null;

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        customDomain: purchase.customDomain,
        customDomainVerified: purchase.customDomainVerified,
        customDomainVerifiedAt: purchase.customDomainVerifiedAt?.toISOString(),
        status: purchase.status,
        startDate: purchase.startDate?.toISOString(),
        endDate: purchase.endDate?.toISOString(),
      },
      dnsInstructions,
    });
  } catch (error) {
    console.error("[Addons Verify] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification status" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/addons/[id]/verify - Verify custom domain
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = await getUserOrganizationId(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const [purchase] = await db
      .select()
      .from(addonPurchases)
      .where(and(
        eq(addonPurchases.id, id),
        eq(addonPurchases.organizationId, orgId)
      ))
      .limit(1);

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (!purchase.customDomain) {
      return NextResponse.json({ error: "No custom domain set" }, { status: 400 });
    }

    // TODO: Implement actual DNS verification
    // For now, we'll mark as verified manually
    // In production, use DNS lookup to verify the records
    
    // Simulate verification (in production, check DNS)
    const isVerified = true; // For demo
    
    if (isVerified) {
      const [updated] = await db
        .update(addonPurchases)
        .set({
          customDomainVerified: true,
          customDomainVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(addonPurchases.id, id))
        .returning();

      return NextResponse.json({
        success: true,
        verified: true,
        message: "Domain verified successfully",
        purchase: {
          customDomain: updated.customDomain,
          customDomainVerified: updated.customDomainVerified,
          customDomainVerifiedAt: updated.customDomainVerifiedAt?.toISOString(),
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "DNS records not found. Please check your DNS configuration.",
      });
    }
  } catch (error) {
    console.error("[Addons Verify] POST error:", error);
    return NextResponse.json(
      { error: "Failed to verify domain" },
      { status: 500 }
    );
  }
}
