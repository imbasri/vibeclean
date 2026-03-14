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
      console.error("[Onboarding] No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userName = session.user.name || "User";

    console.log("[Onboarding] Starting for user:", userId, userName);

    // Check if user already has an organization
    const existingMembership = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (existingMembership.length > 0) {
      console.log("[Onboarding] User already has organization");
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
      console.log("[Onboarding] Request body:", body);
      
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
    } catch (e) {
      console.log("[Onboarding] No body provided, using defaults");
    }

    // Validate required fields
    if (!organizationName || organizationName.trim().length < 2) {
      return NextResponse.json(
        { error: "Nama laundry minimal 2 karakter" },
        { status: 400 }
      );
    }

    if (!branchName || branchName.trim().length < 2) {
      return NextResponse.json(
        { error: "Nama cabang minimal 2 karakter" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(organizationName);
    console.log("[Onboarding] Generated slug:", slug);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create organization in a transaction for safety
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [newOrganization] = await tx
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

      console.log("[Onboarding] Organization created:", newOrganization.id);

      // Create default branch
      const [newBranch] = await tx
        .insert(branches)
        .values({
          organizationId: newOrganization.id,
          name: branchName,
          address: branchAddress || "Alamat belum diatur",
          phone: branchPhone || "-",
          isActive: true,
        })
        .returning();

      console.log("[Onboarding] Branch created:", newBranch.id);

      // Create organization membership
      const [membership] = await tx
        .insert(organizationMembers)
        .values({
          userId,
          organizationId: newOrganization.id,
          invitedBy: userId, // Self-invited (owner)
        })
        .returning();

      console.log("[Onboarding] Membership created:", membership.id);

      // Create branch permission with owner role
      await tx.insert(branchPermissions).values({
        memberId: membership.id,
        branchId: newBranch.id,
        role: "owner",
      });

      console.log("[Onboarding] Branch permission created");

      return {
        organization: newOrganization,
        branch: newBranch,
      };
    });

    console.log("[Onboarding] Success! Organization:", result.organization.id);

    return NextResponse.json({
      success: true,
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        plan: result.organization.plan,
        trialEndsAt: result.organization.trialEndsAt,
      },
      branch: {
        id: result.branch.id,
        name: result.branch.name,
      },
    });
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to initialize organization";
    
    if (error instanceof Error) {
      console.error("[Onboarding] Error details:", error.message);
      errorMessage = error.message;
      
      // Check for common database errors
      if (error.message.includes("unique constraint")) {
        errorMessage = "Nama laundry sudah digunakan, coba nama lain";
      } else if (error.message.includes("foreign key")) {
        errorMessage = "Data tidak valid, periksa kembali input";
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
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
