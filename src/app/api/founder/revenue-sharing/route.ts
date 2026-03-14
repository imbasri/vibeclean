/**
 * Revenue Sharing Settings API
 * 
 * Manage organization-specific transaction fee overrides
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { db, revenueSharingSettings, organizations } from "@/lib/db";
import { eq, like, or, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get("organizationId");
    const search = searchParams.get("search");

    let results;
    
    if (orgId) {
      results = await db
        .select({
          id: revenueSharingSettings.id,
          organizationId: revenueSharingSettings.organizationId,
          customFeeType: revenueSharingSettings.customFeeType,
          customFeeValue: revenueSharingSettings.customFeeValue,
          customFeeMin: revenueSharingSettings.customFeeMin,
          customFeeMax: revenueSharingSettings.customFeeMax,
          founderDiscountPercent: revenueSharingSettings.founderDiscountPercent,
          reason: revenueSharingSettings.reason,
          createdAt: revenueSharingSettings.createdAt,
          updatedAt: revenueSharingSettings.updatedAt,
          orgName: organizations.name,
          orgSlug: organizations.slug,
          orgPlan: organizations.plan,
        })
        .from(revenueSharingSettings)
        .leftJoin(organizations, eq(revenueSharingSettings.organizationId, organizations.id))
        .where(eq(revenueSharingSettings.organizationId, orgId));
    } else {
      results = await db
        .select({
          id: revenueSharingSettings.id,
          organizationId: revenueSharingSettings.organizationId,
          customFeeType: revenueSharingSettings.customFeeType,
          customFeeValue: revenueSharingSettings.customFeeValue,
          customFeeMin: revenueSharingSettings.customFeeMin,
          customFeeMax: revenueSharingSettings.customFeeMax,
          founderDiscountPercent: revenueSharingSettings.founderDiscountPercent,
          reason: revenueSharingSettings.reason,
          createdAt: revenueSharingSettings.createdAt,
          updatedAt: revenueSharingSettings.updatedAt,
          orgName: organizations.name,
          orgSlug: organizations.slug,
          orgPlan: organizations.plan,
        })
        .from(revenueSharingSettings)
        .leftJoin(organizations, eq(revenueSharingSettings.organizationId, organizations.id));
    }

    // Filter by search if provided (client-side for now)
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.orgName?.toLowerCase().includes(searchLower) ||
          r.orgSlug?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ settings: results });
  } catch (error) {
    console.error("[Revenue Sharing] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue sharing settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      organizationId,
      customFeeType,
      customFeeValue,
      customFeeMin,
      customFeeMax,
      founderDiscountPercent,
      reason,
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(revenueSharingSettings)
      .where(eq(revenueSharingSettings.organizationId, organizationId));

    let result;
    
    if (existing) {
      // Update existing
      [result] = await db
        .update(revenueSharingSettings)
        .set({
          customFeeType: customFeeType ?? existing.customFeeType,
          customFeeValue: customFeeValue ?? existing.customFeeValue,
          customFeeMin: customFeeMin ?? existing.customFeeMin,
          customFeeMax: customFeeMax ?? existing.customFeeMax,
          founderDiscountPercent: founderDiscountPercent ?? existing.founderDiscountPercent,
          reason: reason ?? existing.reason,
          updatedAt: new Date(),
        })
        .where(eq(revenueSharingSettings.organizationId, organizationId))
        .returning();
    } else {
      // Create new
      [result] = await db
        .insert(revenueSharingSettings)
        .values({
          organizationId,
          customFeeType,
          customFeeValue,
          customFeeMin,
          customFeeMax,
          founderDiscountPercent: founderDiscountPercent || "0",
          reason,
        })
        .returning();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Revenue Sharing] POST error:", error);
    return NextResponse.json(
      { error: "Failed to save revenue sharing settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    await db
      .delete(revenueSharingSettings)
      .where(eq(revenueSharingSettings.organizationId, organizationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Revenue Sharing] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete revenue sharing settings" },
      { status: 500 }
    );
  }
}
