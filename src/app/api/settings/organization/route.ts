import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, organizations, organizationMembers, branchPermissions } from "@/lib/db";
import { eq } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to check if user is owner and get their organization
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

  const isOwner = permissions.some((p) => p.role === "owner");

  return {
    organizationId: membership[0].organizationId,
    isOwner,
  };
}

// GET /api/settings/organization - Get organization settings
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userOrg = await getUserOrganization(session.user.id);

    if (!userOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!userOrg.isOwner) {
      return NextResponse.json(
        { error: "Only owners can access organization settings" },
        { status: 403 }
      );
    }

    // Get organization details
    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        plan: organizations.plan,
        subscriptionStatus: organizations.subscriptionStatus,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .where(eq(organizations.id, userOrg.organizationId));

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo || "",
        plan: organization.plan,
        subscriptionStatus: organization.subscriptionStatus,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/organization - Update organization settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userOrg = await getUserOrganization(session.user.id);

    if (!userOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!userOrg.isOwner) {
      return NextResponse.json(
        { error: "Only owners can update organization settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, logo } = body as { 
      name?: string; 
      slug?: string; 
      logo?: string;
    };

    // Validate input
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (slug !== undefined) {
      if (typeof slug !== "string" || slug.trim().length === 0) {
        return NextResponse.json(
          { error: "Slug must be a non-empty string" },
          { status: 400 }
        );
      }

      // Validate slug format (lowercase, alphanumeric, hyphens)
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug.trim())) {
        return NextResponse.json(
          { error: "Slug must be lowercase and contain only letters, numbers, and hyphens" },
          { status: 400 }
        );
      }

      // Check if slug is already taken by another organization
      const existingOrg = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, slug.trim()))
        .limit(1);

      if (existingOrg.length > 0 && existingOrg[0].id !== userOrg.organizationId) {
        return NextResponse.json(
          { error: "This slug is already taken by another organization" },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: Partial<{ 
      name: string; 
      slug: string; 
      logo: string;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (slug !== undefined) {
      updateData.slug = slug.trim().toLowerCase();
    }

    if (logo !== undefined) {
      updateData.logo = logo.trim();
    }

    // Update organization
    const [updatedOrg] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, userOrg.organizationId))
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        plan: organizations.plan,
        subscriptionStatus: organizations.subscriptionStatus,
      });

    if (!updatedOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Organization updated successfully",
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        logo: updatedOrg.logo || "",
        plan: updatedOrg.plan,
        subscriptionStatus: updatedOrg.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization settings" },
      { status: 500 }
    );
  }
}
