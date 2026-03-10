import { NextRequest, NextResponse } from "next/server";
import { db, branches, organizations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createOrderPayment, isMayarConfigured } from "@/lib/mayar";
import { z } from "zod";

// Request validation schema
const createPublicPaymentSchema = z.object({
  branchId: z.string().uuid(),
  amount: z.number().positive(),
  customerName: z.string().optional().default("Pelanggan"),
  customerPhone: z.string().optional().default("08000000000"),
});

// POST /api/payments/public/create - Create a payment without authentication
export async function POST(request: NextRequest) {
  try {
    // Check if Mayar is configured
    if (!isMayarConfigured()) {
      return NextResponse.json(
        { error: "Payment gateway is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    
    // Validate request
    const validationResult = createPublicPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { branchId, amount, customerName, customerPhone } = validationResult.data;

    // Get branch
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, branch.organizationId));

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Generate a simple order ID for this payment
    const orderId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create payment via Mayar
    const paymentResult = await createOrderPayment({
      orderId,
      amount,
      customerName,
      customerPhone,
      paymentType: "qris",
      description: `Pembayaran laundry di ${branch.name}`,
      expiredInMinutes: 30,
    });

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "Failed to create payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentResult.paymentId,
      transactionId: paymentResult.transactionId,
      paymentUrl: paymentResult.paymentUrl,
      qrCodeUrl: paymentResult.qrCodeUrl,
      expiredAt: paymentResult.expiredAt,
      branch: {
        id: branch.id,
        name: branch.name,
      },
      organization: {
        name: organization.name,
      },
    });
  } catch (error) {
    console.error("Error creating public payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
