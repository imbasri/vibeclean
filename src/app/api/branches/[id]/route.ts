import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  branches,
  organizationMembers,
  branchPermissions,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to check if user has owner/manager role for a branch
async function hasPermissionForBranch(
  userId: string,
  branchId: string,
  requiredRoles: string[] = ["owner", "manager"]
): Promise<boolean> {
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
        eq(branchPermissions.branchId, branchId)
      )
    );

  return permission.some((p) => requiredRoles.includes(p.role));
}

// GET /api/branches/[id] - Get a specific branch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    const hasPermission = await hasPermissionForBranch(session.user.id, id, [
      "owner",
      "manager",
      "cashier",
      "courier",
    ]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Akses ke cabang ini tidak diizinkan" },
        { status: 403 }
      );
    }

    // Get the branch
    const branch = await db
      .select()
      .from(branches)
      .where(eq(branches.id, id))
      .limit(1);

    if (!branch[0]) {
      return NextResponse.json(
        { error: "Cabang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ branch: branch[0] });
  } catch (error) {
    console.error("Error fetching branch:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch" },
      { status: 500 }
    );
  }
}

// PATCH /api/branches/[id] - Update a branch
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has owner/manager permission
    const hasPermission = await hasPermissionForBranch(session.user.id, id);

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Hanya owner atau manager yang dapat mengubah cabang" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, phone, isActive } = body;

    // Build update object
    const updateData: Partial<{
      name: string;
      address: string;
      phone: string;
      isActive: boolean;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the branch
    const [updatedBranch] = await db
      .update(branches)
      .set(updateData)
      .where(eq(branches.id, id))
      .returning();

    if (!updatedBranch) {
      return NextResponse.json(
        { error: "Cabang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ branch: updatedBranch });
  } catch (error) {
    console.error("Error updating branch:", error);
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
  }
}

// DELETE /api/branches/[id] - Delete (deactivate) a branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Only owner can delete branches
    const hasPermission = await hasPermissionForBranch(session.user.id, id, ["owner"]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat menghapus cabang" },
        { status: 403 }
      );
    }

    // Soft delete - just deactivate the branch
    const [deactivatedBranch] = await db
      .update(branches)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id))
      .returning();

    if (!deactivatedBranch) {
      return NextResponse.json(
        { error: "Cabang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Cabang berhasil dinonaktifkan",
      branch: deactivatedBranch,
    });
  } catch (error) {
    console.error("Error deleting branch:", error);
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    );
  }
}
