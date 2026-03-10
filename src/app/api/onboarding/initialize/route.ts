import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  organizations,
  branches,
  organizationMembers,
  branchPermissions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Helper to generate slug from organization name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// Helper to generate unique slug
async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = generateSlug(baseName);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety limit
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * POST /api/onboarding/initialize
 * 
 * Initialize a new organization for a newly registered user.
 * Creates:
 * - Organization with starter plan
 * - Default branch ("Cabang Utama")
 * - Organization membership for user
 * - Branch permission (owner role) for user
 */
export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userName = session.user.name || "User";

    // Check if user already has an organization
    const existingMembership = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (existingMembership.length > 0) {
      return NextResponse.json(
        { error: "User already has an organization", code: "ALREADY_ONBOARDED" },
        { status: 400 }
      );
    }

    // Parse optional body for custom organization name
    let organizationName = `Laundry ${userName}`;
    let branchName = "Cabang Utama";
    let branchAddress = "";
    let branchPhone = "";

    try {
      const body = await req.json();
      if (body.organizationName) {
        organizationName = body.organizationName;
      }
      if (body.branchName) {
        branchName = body.branchName;
      }
      if (body.branchAddress) {
        branchAddress = body.branchAddress;
      }
      if (body.branchPhone) {
        branchPhone = body.branchPhone;
      }
    } catch {
      // Body is optional, use defaults
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(organizationName);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create organization
    const [newOrganization] = await db
      .insert(organizations)
      .values({
        name: organizationName,
        slug,
        plan: "starter",
        subscriptionStatus: "trial",
        trialEndsAt,
        ownerId: userId,
      })
      .returning();

    // Create default branch
    const [newBranch] = await db
      .insert(branches)
      .values({
        organizationId: newOrganization.id,
        name: branchName,
        address: branchAddress || "Alamat belum diatur",
        phone: branchPhone || "-",
        isActive: true,
      })
      .returning();

    // Create organization membership
    const [membership] = await db
      .insert(organizationMembers)
      .values({
        userId,
        organizationId: newOrganization.id,
        invitedBy: userId, // Self-invited (owner)
      })
      .returning();

    // Create branch permission with owner role
    await db.insert(branchPermissions).values({
      memberId: membership.id,
      branchId: newBranch.id,
      role: "owner",
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: newOrganization.id,
        name: newOrganization.name,
        slug: newOrganization.slug,
        plan: newOrganization.plan,
        trialEndsAt: newOrganization.trialEndsAt,
      },
      branch: {
        id: newBranch.id,
        name: newBranch.name,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to initialize organization" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/initialize
 * 
 * Check if user needs onboarding (has no organization)
 */
export async function GET() {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user has an organization
    const existingMembership = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    const needsOnboarding = existingMembership.length === 0;

    return NextResponse.json({
      needsOnboarding,
      userId,
    });
  } catch (error) {
    console.error("Onboarding check error:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}
