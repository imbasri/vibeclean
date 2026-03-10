import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, orders, organizationMembers, branchPermissions } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

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

// Request validation schema
const checkStatusSchema = z.object({
  orderId: z.string().uuid(),
});

// POST /api/payments/status - Check payment status for an order
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request
    const validationResult = checkStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { orderId } = validationResult.data;

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json(
        { error: "No branch access" },
        { status: 403 }
      );
    }

    // Fetch the order
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        paidAmount: orders.paidAmount,
        mayarPaymentId: orders.mayarPaymentId,
        mayarTransactionId: orders.mayarTransactionId,
        paymentUrl: orders.paymentUrl,
        qrCodeUrl: orders.qrCodeUrl,
        paymentExpiredAt: orders.paymentExpiredAt,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          inArray(orders.branchId, userBranchIds)
        )
      );

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or access denied" },
        { status: 404 }
      );
    }

    // Check if payment is expired
    const isExpired = order.paymentExpiredAt && new Date() > order.paymentExpiredAt;

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: parseFloat(order.total),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paidAmount: parseFloat(order.paidAmount),
      mayarPaymentId: order.mayarPaymentId,
      paymentUrl: order.paymentUrl,
      qrCodeUrl: order.qrCodeUrl,
      paymentExpiredAt: order.paymentExpiredAt,
      paidAt: order.paidAt,
      isExpired,
      isPaid: order.paymentStatus === "paid",
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
