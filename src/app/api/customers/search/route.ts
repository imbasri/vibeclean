import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, customers, orders } from "@/lib/db";
import { eq, or, ilike, sql } from "drizzle-orm";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// GET /api/customers/search - Search customers by name or phone
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    // Search customers by name or phone
    const searchQuery = `%${query}%`;
    
    const results = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        totalOrders: sql<number>`COALESCE(COUNT(DISTINCT orders.id), 0)`.mapWith(Number),
        totalSpent: sql<number>`COALESCE(SUM(CAST(orders.total AS NUMERIC)), 0)`.mapWith(Number),
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(
        or(
          ilike(customers.name, searchQuery),
          ilike(customers.phone, searchQuery)
        )
      )
      .groupBy(customers.id)
      .limit(10);

    return NextResponse.json({ 
      customers: results.map(c => ({
        ...c,
        totalOrders: c.totalOrders || 0,
        totalSpent: c.totalSpent || 0,
      }))
    });
  } catch (error) {
    console.error("Customer search error:", error);
    return NextResponse.json(
      { error: "Failed to search customers" },
      { status: 500 }
    );
  }
}
