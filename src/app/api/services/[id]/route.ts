import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, services, organizationMembers, branchPermissions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createServiceSchema } from "@/lib/validations/schemas";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to check user permission for a branch
async function checkBranchPermission(
  userId: string,
  branchId: string,
  requiredRoles: string[] = ["owner", "manager"]
): Promise<boolean> {
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
        eq(organizationMembers.userId, userId),
        eq(branchPermissions.branchId, branchId)
      )
    );

  return userPermissions.some((p) => requiredRoles.includes(p.role));
}

// GET /api/services/[id] - Get a single service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the service
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, id));

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Check user has access to this branch
    const hasAccess = await checkBranchPermission(
      session.user.id,
      service.branchId,
      ["owner", "manager", "cashier", "courier"]
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this service" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      service: {
        ...service,
        price: parseFloat(service.price),
      },
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

// PUT /api/services/[id] - Update a service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the existing service
    const [existingService] = await db
      .select()
      .from(services)
      .where(eq(services.id, id));

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Check user has permission to update (owner/manager only)
    const hasPermission = await checkBranchPermission(
      session.user.id,
      existingService.branchId,
      ["owner", "manager"]
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to update this service" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate service data
    const validationResult = createServiceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validData = validationResult.data;

    // Update the service
    const [updatedService] = await db
      .update(services)
      .set({
        name: validData.name,
        category: validData.category,
        unit: validData.unit,
        price: validData.price.toString(),
        estimatedDays: validData.estimatedDays,
        description: validData.description || null,
        isActive: body.isActive ?? existingService.isActive,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return NextResponse.json({
      service: {
        ...updatedService,
        price: parseFloat(updatedService.price),
      },
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE /api/services/[id] - Delete a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the existing service
    const [existingService] = await db
      .select()
      .from(services)
      .where(eq(services.id, id));

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Check user has permission to delete (owner/manager only)
    const hasPermission = await checkBranchPermission(
      session.user.id,
      existingService.branchId,
      ["owner", "manager"]
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to delete this service" },
        { status: 403 }
      );
    }

    // Delete the service
    await db.delete(services).where(eq(services.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}

// PATCH /api/services/[id] - Toggle service status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the existing service
    const [existingService] = await db
      .select()
      .from(services)
      .where(eq(services.id, id));

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Check user has permission (owner/manager only)
    const hasPermission = await checkBranchPermission(
      session.user.id,
      existingService.branchId,
      ["owner", "manager"]
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to update this service" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update only specified fields
    const [updatedService] = await db
      .update(services)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return NextResponse.json({
      service: {
        ...updatedService,
        price: parseFloat(updatedService.price),
      },
    });
  } catch (error) {
    console.error("Error patching service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}
