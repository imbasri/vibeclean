import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, services, organizationMembers, branchPermissions, branches } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { createServiceSchema } from "@/lib/validations/schemas";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to get user's accessible branch IDs
async function getUserBranchIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({
      branchId: branchPermissions.branchId,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(eq(organizationMembers.userId, userId));

  return memberships.map((m) => m.branchId);
}

// GET /api/services - List services for user's branches
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get branchId from query params (optional filter)
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({ services: [] });
    }

    // Build query
    let query = db
      .select({
        id: services.id,
        branchId: services.branchId,
        name: services.name,
        category: services.category,
        unit: services.unit,
        price: services.price,
        estimatedDays: services.estimatedDays,
        description: services.description,
        isActive: services.isActive,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services);

    // Filter by specific branch or all user's branches
    const targetBranchIds = branchId && userBranchIds.includes(branchId) 
      ? [branchId] 
      : userBranchIds;

    const result = await query.where(
      inArray(services.branchId, targetBranchIds)
    );

    // Apply additional filters in memory (simpler than complex SQL)
    let filteredResult = result;

    if (category && category !== "all") {
      filteredResult = filteredResult.filter((s) => s.category === category);
    }

    if (isActive !== null && isActive !== "all") {
      const activeFilter = isActive === "true";
      filteredResult = filteredResult.filter((s) => s.isActive === activeFilter);
    }

    // Convert price from string to number for response
    const servicesWithNumberPrice = filteredResult.map((s) => ({
      ...s,
      price: parseFloat(s.price),
    }));

    return NextResponse.json({ services: servicesWithNumberPrice });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { branchId, ...serviceData } = body;

    // Validate branchId is provided
    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required" },
        { status: 400 }
      );
    }

    // Check user has access to this branch with owner/manager role
    const userPermissions = await db
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
          eq(organizationMembers.userId, session.user.id),
          eq(branchPermissions.branchId, branchId)
        )
      );

    const hasPermission = userPermissions.some(
      (p) => p.role === "owner" || p.role === "manager"
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to create services in this branch" },
        { status: 403 }
      );
    }

    // Validate service data
    const validationResult = createServiceSchema.safeParse(serviceData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validData = validationResult.data;

    // Create the service
    const [newService] = await db
      .insert(services)
      .values({
        branchId,
        name: validData.name,
        category: validData.category,
        unit: validData.unit,
        price: validData.price.toString(),
        estimatedDays: validData.estimatedDays,
        description: validData.description || null,
        isActive: body.isActive ?? true,
      })
      .returning();

    return NextResponse.json({
      service: {
        ...newService,
        price: parseFloat(newService.price),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
