import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  users,
  organizationMembers,
  branchPermissions,
  branches,
  staffInvitations,
  invitationPermissions,
} from "@/lib/db";
import { eq, and, inArray, sql, desc, ne } from "drizzle-orm";
import type { UserRole, BranchPermission } from "@/types";

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

// Helper to check if user has owner or manager role
async function hasStaffManagementAccess(userId: string): Promise<boolean> {
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
        inArray(branchPermissions.role, ["owner", "manager"])
      )
    )
    .limit(1);

  return permission.length > 0;
}

// Staff member type returned by the API
interface StaffMember {
  id: string;
  memberId: string;
  email: string;
  name: string;
  phone: string | null;
  image: string | null;
  emailVerified: boolean;
  permissions: BranchPermission[];
  joinedAt: Date;
  createdAt: Date;
}

// GET /api/staff - List all staff members in the organization
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json({ staff: [], total: 0 });
    }

    // Check if user has permission to view staff
    const hasAccess = await hasStaffManagementAccess(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk melihat data karyawan" },
        { status: 403 }
      );
    }

    // Get all members in the organization (excluding current user)
    const members = await db
      .select({
        memberId: organizationMembers.id,
        userId: organizationMembers.userId,
        joinedAt: organizationMembers.joinedAt,
        email: users.email,
        name: users.name,
        phone: users.phone,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          ne(organizationMembers.userId, session.user.id)
        )
      )
      .orderBy(desc(organizationMembers.joinedAt));

    if (members.length === 0) {
      return NextResponse.json({ staff: [], total: 0 });
    }

    // Get all branches in the organization for name lookup
    const orgBranches = await db
      .select({
        id: branches.id,
        name: branches.name,
      })
      .from(branches)
      .where(eq(branches.organizationId, organizationId));

    const branchMap = new Map(orgBranches.map((b) => [b.id, b.name]));

    // Get all branch permissions for these members
    const memberIds = members.map((m) => m.memberId);
    const permissions = await db
      .select({
        memberId: branchPermissions.memberId,
        branchId: branchPermissions.branchId,
        role: branchPermissions.role,
      })
      .from(branchPermissions)
      .where(inArray(branchPermissions.memberId, memberIds));

    // Group permissions by member
    const permissionsByMember = new Map<string, Map<string, UserRole[]>>();
    
    for (const perm of permissions) {
      if (!permissionsByMember.has(perm.memberId)) {
        permissionsByMember.set(perm.memberId, new Map());
      }
      const memberPerms = permissionsByMember.get(perm.memberId)!;
      if (!memberPerms.has(perm.branchId)) {
        memberPerms.set(perm.branchId, []);
      }
      memberPerms.get(perm.branchId)!.push(perm.role as UserRole);
    }

    // Build staff list with permissions
    const staffList: StaffMember[] = members.map((member) => {
      const memberPerms = permissionsByMember.get(member.memberId);
      const branchPermissionsList: BranchPermission[] = [];

      if (memberPerms) {
        for (const [branchId, roles] of memberPerms.entries()) {
          branchPermissionsList.push({
            branchId,
            branchName: branchMap.get(branchId) || "Unknown",
            roles,
          });
        }
      }

      return {
        id: member.userId,
        memberId: member.memberId,
        email: member.email,
        name: member.name,
        phone: member.phone,
        image: member.image,
        emailVerified: member.emailVerified,
        permissions: branchPermissionsList,
        joinedAt: member.joinedAt,
        createdAt: member.createdAt,
      };
    });

    return NextResponse.json({
      staff: staffList,
      total: staffList.length,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

// POST /api/staff - Invite a new staff member
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

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

    // Check if user has permission to invite staff
    const hasAccess = await hasStaffManagementAccess(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk mengundang karyawan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, branchPermissions: perms } = body;

    // Validate required fields
    if (!email || !perms || !Array.isArray(perms) || perms.length === 0) {
      return NextResponse.json(
        { error: "Email dan minimal satu peran per cabang wajib diisi" },
        { status: 400 }
      );
    }

    // Check if email already exists as a member
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser[0]) {
      const existingMember = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, existingUser[0].id),
            eq(organizationMembers.organizationId, organizationId)
          )
        )
        .limit(1);

      if (existingMember[0]) {
        return NextResponse.json(
          { error: "Email ini sudah terdaftar sebagai karyawan" },
          { status: 400 }
        );
      }
    }

    // Check if there's a pending invitation
    const pendingInvitation = await db
      .select({ id: staffInvitations.id })
      .from(staffInvitations)
      .where(
        and(
          eq(staffInvitations.email, email),
          eq(staffInvitations.organizationId, organizationId),
          eq(staffInvitations.status, "pending")
        )
      )
      .limit(1);

    if (pendingInvitation[0]) {
      return NextResponse.json(
        { error: "Undangan untuk email ini sudah ada dan masih pending" },
        { status: 400 }
      );
    }

    // Create the invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation] = await db
      .insert(staffInvitations)
      .values({
        email,
        organizationId,
        invitedBy: session.user.id,
        expiresAt,
        status: "pending",
      })
      .returning();

    // Create invitation permissions
    const permissionValues: {
      invitationId: string;
      branchId: string;
      role: "owner" | "manager" | "cashier" | "courier";
    }[] = [];

    for (const perm of perms) {
      if (perm.branchId && perm.roles && Array.isArray(perm.roles)) {
        for (const role of perm.roles) {
          permissionValues.push({
            invitationId: invitation.id,
            branchId: perm.branchId,
            role: role as "owner" | "manager" | "cashier" | "courier",
          });
        }
      }
    }

    if (permissionValues.length > 0) {
      await db.insert(invitationPermissions).values(permissionValues);
    }

    // TODO: Send invitation email via email service

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        message: "Undangan berhasil dikirim",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
