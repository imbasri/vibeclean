import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  organizationMembers,
  branchPermissions,
  branches,
} from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import type { UserRole } from "@/types";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to get user's organization ID
async function getUserOrganizationId(userId: string): Promise<string | null> {
  const membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organizationId || null;
}

// Helper to check if user has owner role (only owners can modify staff)
async function isOwner(userId: string): Promise<boolean> {
  const permission = await db
    .select({
      role: branchPermissions.role,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(branchPermissions.role, "owner")
      )
    )
    .limit(1);

  return permission.length > 0;
}

type Params = Promise<{ memberId: string }>;

// GET /api/staff/[memberId] - Get a single staff member's details
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    const { memberId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get the member
    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, organizationId)
      ),
      with: {
        user: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get permissions
    const permissions = await db
      .select({
        branchId: branchPermissions.branchId,
        role: branchPermissions.role,
        branchName: branches.name,
      })
      .from(branchPermissions)
      .innerJoin(branches, eq(branches.id, branchPermissions.branchId))
      .where(eq(branchPermissions.memberId, memberId));

    // Group by branch
    const permissionMap = new Map<string, { branchName: string; roles: UserRole[] }>();
    for (const perm of permissions) {
      if (!permissionMap.has(perm.branchId)) {
        permissionMap.set(perm.branchId, {
          branchName: perm.branchName,
          roles: [],
        });
      }
      permissionMap.get(perm.branchId)!.roles.push(perm.role as UserRole);
    }

    const branchPermissionsList = Array.from(permissionMap.entries()).map(
      ([branchId, data]) => ({
        branchId,
        branchName: data.branchName,
        roles: data.roles,
      })
    );

    return NextResponse.json({
      staff: {
        id: member.user.id,
        memberId: member.id,
        email: member.user.email,
        name: member.user.name,
        phone: member.user.phone,
        image: member.user.image,
        emailVerified: member.user.emailVerified,
        permissions: branchPermissionsList,
        joinedAt: member.joinedAt,
        createdAt: member.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching staff member:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff member" },
      { status: 500 }
    );
  }
}

// PATCH /api/staff/[memberId] - Update staff permissions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    const { memberId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can modify staff permissions
    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat mengubah peran karyawan" },
        { status: 403 }
      );
    }

    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify member belongs to this organization
    const member = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!member[0]) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { branchPermissions: newPermissions } = body;

    if (!newPermissions || !Array.isArray(newPermissions)) {
      return NextResponse.json(
        { error: "Format permissions tidak valid" },
        { status: 400 }
      );
    }

    // Delete all existing permissions for this member
    await db
      .delete(branchPermissions)
      .where(eq(branchPermissions.memberId, memberId));

    // Insert new permissions
    const permissionValues: {
      memberId: string;
      branchId: string;
      role: "owner" | "manager" | "cashier" | "courier";
    }[] = [];

    for (const perm of newPermissions) {
      if (perm.branchId && perm.roles && Array.isArray(perm.roles)) {
        for (const role of perm.roles) {
          // Prevent assigning owner role through this endpoint
          if (role === "owner") {
            return NextResponse.json(
              { error: "Tidak dapat menetapkan peran owner melalui endpoint ini" },
              { status: 400 }
            );
          }
          permissionValues.push({
            memberId,
            branchId: perm.branchId,
            role: role as "owner" | "manager" | "cashier" | "courier",
          });
        }
      }
    }

    if (permissionValues.length > 0) {
      await db.insert(branchPermissions).values(permissionValues);
    }

    return NextResponse.json({
      message: "Peran karyawan berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating staff permissions:", error);
    return NextResponse.json(
      { error: "Failed to update staff permissions" },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[memberId] - Remove a staff member from organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    const { memberId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can remove staff
    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat menghapus karyawan" },
        { status: 403 }
      );
    }

    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify member belongs to this organization and is not the current user
    const member = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!member[0]) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Prevent self-removal
    if (member[0].userId === session.user.id) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus diri sendiri" },
        { status: 400 }
      );
    }

    // Check if the member being removed is an owner
    const memberIsOwner = await db
      .select({ role: branchPermissions.role })
      .from(branchPermissions)
      .where(
        and(
          eq(branchPermissions.memberId, memberId),
          eq(branchPermissions.role, "owner")
        )
      )
      .limit(1);

    if (memberIsOwner[0]) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus owner dari organisasi" },
        { status: 400 }
      );
    }

    // Delete the member (cascade will delete branch_permissions)
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, memberId));

    return NextResponse.json({
      message: "Karyawan berhasil dihapus dari organisasi",
    });
  } catch (error) {
    console.error("Error removing staff member:", error);
    return NextResponse.json(
      { error: "Failed to remove staff member" },
      { status: 500 }
    );
  }
}
