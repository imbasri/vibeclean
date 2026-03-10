import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  users,
  organizations,
  branches,
  organizationMembers,
  branchPermissions,
} from "@/lib/db";
import { eq } from "drizzle-orm";

// Types for API response
interface BranchPermissionResponse {
  branchId: string;
  branchName: string;
  roles: string[];
}

interface UserPermissionsResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscriptionStatus: string;
  } | null;
  branches: {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
  }[];
  permissions: BranchPermissionResponse[];
  needsOnboarding: boolean;
}

// GET /api/user/permissions
// Returns user data with their organization, branches, and permissions
export async function GET(request: NextRequest) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user data
    const [userData] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's organization memberships
    const memberships = await db
      .select({
        memberId: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));

    // If user has no organization membership, they need onboarding
    if (memberships.length === 0) {
      return NextResponse.json({
        user: userData,
        organization: null,
        branches: [],
        permissions: [],
        needsOnboarding: true,
      } as UserPermissionsResponse);
    }

    // Get the first organization (primary)
    // TODO: Support multiple organizations in future
    const primaryMembership = memberships[0];

    // Get organization details
    const [orgData] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        subscriptionStatus: organizations.subscriptionStatus,
      })
      .from(organizations)
      .where(eq(organizations.id, primaryMembership.organizationId))
      .limit(1);

    if (!orgData) {
      return NextResponse.json({
        user: userData,
        organization: null,
        branches: [],
        permissions: [],
        needsOnboarding: true,
      } as UserPermissionsResponse);
    }

    // Get all branches for this organization
    const orgBranches = await db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
        phone: branches.phone,
        isActive: branches.isActive,
      })
      .from(branches)
      .where(eq(branches.organizationId, orgData.id));

    // Get branch permissions for this member
    const memberPermissions = await db
      .select({
        branchId: branchPermissions.branchId,
        role: branchPermissions.role,
      })
      .from(branchPermissions)
      .where(eq(branchPermissions.memberId, primaryMembership.memberId));

    // Group permissions by branch
    const permissionsByBranch: Record<string, string[]> = {};
    for (const perm of memberPermissions) {
      if (!permissionsByBranch[perm.branchId]) {
        permissionsByBranch[perm.branchId] = [];
      }
      permissionsByBranch[perm.branchId].push(perm.role);
    }

    // Build permissions array with branch names
    const permissionsResponse: BranchPermissionResponse[] = Object.entries(
      permissionsByBranch
    ).map(([branchId, roles]) => {
      const branch = orgBranches.find((b) => b.id === branchId);
      return {
        branchId,
        branchName: branch?.name || "Unknown Branch",
        roles,
      };
    });

    // Return full response
    const response: UserPermissionsResponse = {
      user: userData,
      organization: orgData,
      branches: orgBranches,
      permissions: permissionsResponse,
      needsOnboarding: permissionsResponse.length === 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user permissions" },
      { status: 500 }
    );
  }
}
