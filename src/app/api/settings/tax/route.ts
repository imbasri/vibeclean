/**
 * Tax Settings API
 * 
 * Get and update organization's tax settings
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, taxSettings, organizations, organizationMembers } from "@/lib/db";
import { eq } from "drizzle-orm";

async function getUserOrgId(userId: string): Promise<string | null> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  
  return member?.organizationId || null;
}

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

    const [settings] = await db
      .select()
      .from(taxSettings)
      .where(eq(taxSettings.organizationId, orgId));

    return NextResponse.json(settings || null);
  } catch (error) {
    console.error("[Tax Settings] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax settings" },
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
    const { taxName, taxType, taxRate, isActive, taxNumber, taxAddress } = body;

    // Check if tax settings exist
    const [existing] = await db
      .select()
      .from(taxSettings)
      .where(eq(taxSettings.organizationId, orgId));

    let result;
    
    if (existing) {
      // Update existing
      [result] = await db
        .update(taxSettings)
        .set({
          taxName: taxName ?? existing.taxName,
          taxType: taxType ?? existing.taxType,
          taxRate: taxRate ?? existing.taxRate,
          isActive: isActive ?? existing.isActive,
          taxNumber: taxNumber ?? existing.taxNumber,
          taxAddress: taxAddress ?? existing.taxAddress,
          updatedAt: new Date(),
        })
        .where(eq(taxSettings.organizationId, orgId))
        .returning();
    } else {
      // Create new
      [result] = await db
        .insert(taxSettings)
        .values({
          organizationId: orgId,
          taxName: taxName || "PPN",
          taxType: taxType || "percentage",
          taxRate: taxRate || "0",
          isActive: isActive ?? true,
          taxNumber: taxNumber || null,
          taxAddress: taxAddress || null,
        })
        .returning();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Tax Settings] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update tax settings" },
      { status: 500 }
    );
  }
}
