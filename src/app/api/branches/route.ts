import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  branches,
  organizations,
  organizationMembers,
  branchPermissions,
  orders,
} from "@/lib/db";
import { eq, and, inArray, sql, desc } from "drizzle-orm";

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

// Helper to check if user has owner role in organization
async function isOwnerInOrganization(userId: string): Promise<boolean> {
  const ownerPermission = await db
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

  return ownerPermission.length > 0;
}

// GET /api/branches - List all branches for user's organization
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    // Get user's organization
    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json({ branches: [], total: 0 });
    }

    // Get branches for the organization
    const branchList = await db
      .select({
        id: branches.id,
        organizationId: branches.organizationId,
        name: branches.name,
        address: branches.address,
        phone: branches.phone,
        isActive: branches.isActive,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .where(eq(branches.organizationId, organizationId))
      .orderBy(desc(branches.createdAt));

    // If stats requested, calculate them
    if (includeStats && branchList.length > 0) {
      const branchIds = branchList.map((b) => b.id);
      
      // Get order stats per branch (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const statsQuery = await db
        .select({
          branchId: orders.branchId,
          totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total}::numeric ELSE 0 END), 0)`,
          totalOrders: sql<number>`COUNT(*)::int`,
          pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('pending', 'processing', 'washing', 'drying', 'ironing') THEN 1 END)::int`,
          completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('completed', 'delivered') THEN 1 END)::int`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.branchId, branchIds),
            sql`${orders.createdAt} >= ${startOfMonth}`
          )
        )
        .groupBy(orders.branchId);

      // Get staff count per branch
      const staffCountQuery = await db
        .select({
          branchId: branchPermissions.branchId,
          staffCount: sql<number>`COUNT(DISTINCT ${branchPermissions.memberId})::int`,
        })
        .from(branchPermissions)
        .where(inArray(branchPermissions.branchId, branchIds))
        .groupBy(branchPermissions.branchId);

      // Create stats map
      const statsMap = new Map(
        statsQuery.map((s) => [
          s.branchId,
          {
            totalRevenue: parseFloat(s.totalRevenue),
            totalOrders: s.totalOrders,
            pendingOrders: s.pendingOrders,
            completedOrders: s.completedOrders,
          },
        ])
      );

      // Create staff count map
      const staffCountMap = new Map(
        staffCountQuery.map((s) => [s.branchId, s.staffCount])
      );

      // Combine branches with stats
      const branchesWithStats = branchList.map((branch) => ({
        ...branch,
        stats: {
          ...(statsMap.get(branch.id) || {
            totalRevenue: 0,
            totalOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
          }),
          staffCount: staffCountMap.get(branch.id) || 0,
        },
      }));

      return NextResponse.json({
        branches: branchesWithStats,
        total: branchesWithStats.length,
      });
    }

    return NextResponse.json({
      branches: branchList,
      total: branchList.length,
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

// POST /api/branches - Create a new branch
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const isOwner = await isOwnerInOrganization(session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat menambah cabang" },
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

    const body = await request.json();
    const { name, address, phone, isActive = true } = body;

    // Validate required fields
    if (!name || !address || !phone) {
      return NextResponse.json(
        { error: "Nama, alamat, dan telepon wajib diisi" },
        { status: 400 }
      );
    }

    // Create the branch
    const [newBranch] = await db
      .insert(branches)
      .values({
        organizationId,
        name,
        address,
        phone,
        isActive,
      })
      .returning();

    // Get user's membership to add owner permission
    const membership = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (membership[0]) {
      // Add owner permission for this new branch
      await db.insert(branchPermissions).values({
        memberId: membership[0].id,
        branchId: newBranch.id,
        role: "owner",
      });
    }

    return NextResponse.json({ branch: newBranch }, { status: 201 });
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
