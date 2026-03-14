import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  users,
  accounts,
  organizationMembers,
  branchPermissions,
  branches,
  staffInvitations,
  invitationPermissions,
} from "@/lib/db";
import { eq, and, inArray, sql, desc, ne } from "drizzle-orm";
import type { UserRole, BranchPermission } from "@/types";
import bcrypt from "bcrypt";

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

// POST /api/staff - Add a new staff member directly (no invitation)
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

    // Check if user has permission to add staff
    const hasAccess = await hasStaffManagementAccess(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk menambahkan karyawan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, branchPermissions: perms } = body;

    // Validate required fields
    if (!name || !email || !perms || !Array.isArray(perms) || perms.length === 0) {
      return NextResponse.json(
        { error: "Nama, email, dan minimal satu peran per cabang wajib diisi" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser[0]) {
      // Check if already a member of this organization
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

      // User exists but no account - create account with password
      const hashedPassword = await bcrypt.hash("vibeclean", 10);
      const userId = existingUser[0].id;

      await db.transaction(async (tx) => {
        // Check if account already exists
        const existingAccount = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.userId, userId))
          .limit(1);

        if (!existingAccount[0]) {
          await tx.insert(accounts).values({
            userId,
            accountId: userId,
            providerId: "password",
            password: hashedPassword,
          });
          console.log("[Staff Create] Account created for existing user");
        }

        // Create organization member
        await tx.insert(organizationMembers).values({
          userId,
          organizationId,
        });

        // Get the member ID
        const [member] = await tx
          .select({ id: organizationMembers.id })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, organizationId)
            )
          );

        // Create branch permissions
        const permissionValues: {
          memberId: string;
          branchId: string;
          role: "owner" | "manager" | "cashier" | "courier";
        }[] = [];

        for (const perm of perms) {
          if (perm.branchId && perm.roles && Array.isArray(perm.roles)) {
            for (const role of perm.roles) {
              permissionValues.push({
                memberId: member.id,
                branchId: perm.branchId,
                role: role as "owner" | "manager" | "cashier" | "courier",
              });
            }
          }
        }

        if (permissionValues.length > 0) {
          await tx.insert(branchPermissions).values(permissionValues);
        }
      });

      return NextResponse.json(
        {
          success: true,
          message: "Karyawan berhasil ditambahkan",
          employee: {
            name,
            email,
          },
        },
        { status: 201 }
      );
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash("vibeclean", 10);
    console.log("[Staff Create] Hashed password:", hashedPassword);
    const userId = crypto.randomUUID();

    // Create user and account in a transaction
    try {
      await db.transaction(async (tx) => {
        // Create user
        await tx.insert(users).values({
          id: userId,
          email: email.toLowerCase(),
          name,
          phone: phone || null,
          emailVerified: true,
        });
        console.log("[Staff Create] User created:", email.toLowerCase());

        // Create account with hashed password (for password auth)
        await tx.insert(accounts).values({
          userId,
          accountId: userId,
          providerId: "password",
          password: hashedPassword,
        });
        console.log("[Staff Create] Account created with password");

        // Create organization member
        await tx.insert(organizationMembers).values({
          userId,
          organizationId,
        });
        console.log("[Staff Create] Member created");

        // Get the member ID
        const [member] = await tx
          .select({ id: organizationMembers.id })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, organizationId)
            )
          );

        // Create branch permissions
        const permissionValues: {
          memberId: string;
          branchId: string;
          role: "owner" | "manager" | "cashier" | "courier";
        }[] = [];

        for (const perm of perms) {
          if (perm.branchId && perm.roles && Array.isArray(perm.roles)) {
            for (const role of perm.roles) {
              permissionValues.push({
                memberId: member.id,
                branchId: perm.branchId,
                role: role as "owner" | "manager" | "cashier" | "courier",
              });
            }
          }
        }

        if (permissionValues.length > 0) {
          await tx.insert(branchPermissions).values(permissionValues);
          console.log("[Staff Create] Permissions created");
        }
      });
    } catch (txError) {
      console.error("[Staff Create] Transaction error:", txError);
      throw txError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Karyawan berhasil ditambahkan",
        employee: {
          name,
          email: email.toLowerCase(),
          phone: phone || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding staff:", error);
    return NextResponse.json(
      { error: "Failed to add staff member" },
      { status: 500 }
    );
  }
}

// PATCH /api/staff - Reset staff password
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasStaffManagementAccess(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk mengatur password karyawan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID wajib diisi" },
        { status: 400 }
      );
    }

    // Get the user ID from member
    const [member] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.id, memberId))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash("vibeclean", 10);

    // Check if account exists
    const [existingAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, member.userId))
      .limit(1);

    if (existingAccount) {
      // Update existing account
      await db
        .update(accounts)
        .set({ password: hashedPassword })
        .where(eq(accounts.id, existingAccount.id));
    } else {
      // Create new account
      await db.insert(accounts).values({
        userId: member.userId,
        accountId: member.userId,
        providerId: "password",
        password: hashedPassword,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Password berhasil direset ke: vibeclean",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
