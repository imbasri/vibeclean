import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, customers, organizationMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createCustomerSchema } from "@/lib/validations/schemas";

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

// GET /api/customers/[id] - Get a single customer
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

    // Get user's organization
    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    // Get the customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      customer: {
        ...customer,
        totalSpent: parseFloat(customer.totalSpent),
      },
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update a customer
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
    const body = await request.json();

    // Get user's organization
    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    // Check if customer exists and belongs to user's organization
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Validate customer data
    const validationResult = createCustomerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validData = validationResult.data;

    // Check if new phone number already exists for another customer
    if (validData.phone !== existingCustomer.phone) {
      const phoneExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            eq(customers.phone, validData.phone)
          )
        )
        .limit(1);

      if (phoneExists.length > 0 && phoneExists[0].id !== id) {
        return NextResponse.json(
          { error: "Pelanggan dengan nomor HP ini sudah terdaftar" },
          { status: 409 }
        );
      }
    }

    // Update the customer
    const [updatedCustomer] = await db
      .update(customers)
      .set({
        name: validData.name,
        phone: validData.phone,
        email: validData.email || null,
        address: validData.address || null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return NextResponse.json({
      customer: {
        ...updatedCustomer,
        totalSpent: parseFloat(updatedCustomer.totalSpent),
      },
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete a customer
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

    // Get user's organization
    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    // Check if customer exists and belongs to user's organization
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has orders (prevent deletion if has orders)
    // For now, we'll allow deletion. In production, consider soft delete.
    
    // Delete the customer
    await db.delete(customers).where(eq(customers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
