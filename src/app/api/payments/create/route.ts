import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, orders, organizationMembers, branchPermissions } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { createOrderPayment, isMayarConfigured } from "@/lib/mayar";
import type { PaymentType } from "@/types/mayar";
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
const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  paymentType: z.enum(["qris", "va", "invoice"]).default("qris"),
  expiredInMinutes: z.number().optional(),
});

// POST /api/payments/create - Create a payment for an order
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Mayar is configured
    if (!isMayarConfigured()) {
      return NextResponse.json(
        { error: "Payment gateway is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    
    // Validate request
    const validationResult = createPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { orderId, paymentType, expiredInMinutes } = validationResult.data;

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
      .select()
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

    // Check if order is already paid
    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Order sudah dibayar" },
        { status: 400 }
      );
    }

    // Check if payment already exists and not expired
    if (order.mayarPaymentId && order.paymentExpiredAt) {
      const now = new Date();
      if (order.paymentExpiredAt > now) {
        // Return existing payment info
        return NextResponse.json({
          success: true,
          paymentId: order.mayarPaymentId,
          transactionId: order.mayarTransactionId,
          paymentUrl: order.paymentUrl,
          qrCodeUrl: order.qrCodeUrl,
          expiredAt: order.paymentExpiredAt,
          message: "Using existing payment",
        });
      }
    }

    // Create payment via Mayar
    const paymentResult = await createOrderPayment({
      orderId: order.id,
      amount: parseFloat(order.total),
      customerName: order.customerName,
      customerEmail: undefined, // We don't have customer email in order
      customerPhone: order.customerPhone,
      paymentType: paymentType as PaymentType,
      description: `Pembayaran Order #${order.orderNumber}`,
      expiredInMinutes,
    });

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "Failed to create payment" },
        { status: 500 }
      );
    }

    // Update order with payment info
    await db
      .update(orders)
      .set({
        mayarPaymentId: paymentResult.paymentId,
        mayarTransactionId: paymentResult.transactionId,
        paymentUrl: paymentResult.paymentUrl,
        qrCodeUrl: paymentResult.qrCodeUrl,
        paymentExpiredAt: paymentResult.expiredAt,
        paymentMethod: paymentType === "qris" ? "qris" : "transfer",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      paymentId: paymentResult.paymentId,
      transactionId: paymentResult.transactionId,
      paymentUrl: paymentResult.paymentUrl,
      qrCodeUrl: paymentResult.qrCodeUrl,
      expiredAt: paymentResult.expiredAt,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
