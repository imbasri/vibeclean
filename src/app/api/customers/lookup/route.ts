import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, customers, organizationMembers, branchPermissions } from "@/lib/db";
import { eq, or, ilike, and } from "drizzle-orm";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

async function getUserOrganizationId(userId: string) {
  const membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organizationId || null;
}

// GET /api/customers/lookup?phone=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.length < 4) {
      return NextResponse.json({ customer: null });
    }

    const organizationId = await getUserOrganizationId(session.user.id);

    if (!organizationId) {
      return NextResponse.json({ customer: null });
    }

    // Search by phone (exact match or contains)
    const [customer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        loyaltyPoints: customers.loyaltyPoints,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          or(
            eq(customers.phone, phone),
            ilike(customers.phone, `%${phone}%`)
          )
        )
      )
      .limit(1);

    return NextResponse.json({ customer: customer || null });
  } catch (error) {
    console.error("Error looking up customer:", error);
    return NextResponse.json({ customer: null });
  }
}
