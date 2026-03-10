import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, customers, organizationMembers, branches } from "@/lib/db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
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

// GET /api/customers - List customers for user's organization
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "totalSpent";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Get user's organization
    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json({ customers: [] });
    }

    // Build base query
    let result = await db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        loyaltyPoints: customers.loyaltyPoints,
        memberSince: customers.memberSince,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(eq(customers.organizationId, organizationId))
      .orderBy(desc(customers.createdAt));

    // Apply search filter in memory (simpler)
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.phone.includes(search) ||
          c.email?.toLowerCase().includes(searchLower)
      );
    }

    // Sort in memory
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalSpent":
          comparison = parseFloat(a.totalSpent) - parseFloat(b.totalSpent);
          break;
        case "totalOrders":
          comparison = a.totalOrders - b.totalOrders;
          break;
        case "memberSince":
          comparison = new Date(a.memberSince).getTime() - new Date(b.memberSince).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Convert totalSpent from string to number for response
    const customersWithNumberValues = result.map((c) => ({
      ...c,
      totalSpent: parseFloat(c.totalSpent),
    }));

    return NextResponse.json({ customers: customersWithNumberValues });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
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

    // Get user's organization
    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
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

    // Check if phone number already exists in this organization
    const existingCustomer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          eq(customers.phone, validData.phone)
        )
      )
      .limit(1);

    if (existingCustomer.length > 0) {
      return NextResponse.json(
        { error: "Pelanggan dengan nomor HP ini sudah terdaftar" },
        { status: 409 }
      );
    }

    // Create the customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        organizationId,
        name: validData.name,
        phone: validData.phone,
        email: validData.email || null,
        address: validData.address || null,
        totalOrders: 0,
        totalSpent: "0",
        loyaltyPoints: 0,
      })
      .returning();

    return NextResponse.json({
      customer: {
        ...newCustomer,
        totalSpent: parseFloat(newCustomer.totalSpent),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
