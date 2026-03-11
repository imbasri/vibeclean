import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  customers,
  organizationMembers,
  branchPermissions,
} from "@/lib/db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { updateOrderStatusSchema, orderStatuses } from "@/lib/validations/schemas";
import { sendTemplatedEmail } from "@/lib/email";

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

// GET /api/orders/[id] - Get a single order with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Fetch the order
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, id), inArray(orders.branchId, userBranchIds))
      );

    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    // Fetch status history
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(desc(orderStatusHistory.createdAt));

    // Convert decimal strings to numbers
    const orderResponse = {
      ...order,
      subtotal: parseFloat(order.subtotal),
      discount: parseFloat(order.discount),
      total: parseFloat(order.total),
      paidAmount: parseFloat(order.paidAmount),
      items: items.map((item) => ({
        ...item,
        quantity: parseFloat(item.quantity),
        pricePerUnit: parseFloat(item.pricePerUnit),
        subtotal: parseFloat(item.subtotal),
      })),
      statusHistory: history,
    };

    return NextResponse.json({ order: orderResponse });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order status or payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Fetch the existing order
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, id), inArray(orders.branchId, userBranchIds))
      );

    if (!existingOrder) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle status update
    if (body.status && body.status !== existingOrder.status) {
      // Validate status
      if (!orderStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Status tidak valid" },
          { status: 400 }
        );
      }

      // Prevent invalid transitions
      if (existingOrder.status === "cancelled") {
        return NextResponse.json(
          { error: "Order yang dibatalkan tidak dapat diubah statusnya" },
          { status: 400 }
        );
      }

      if (existingOrder.status === "completed") {
        return NextResponse.json(
          { error: "Order yang sudah selesai tidak dapat diubah statusnya" },
          { status: 400 }
        );
      }

      updateData.status = body.status;

      // Set completedAt if status is completed
      if (body.status === "completed") {
        updateData.completedAt = new Date();
      }
    }

    // Handle payment status update
    if (body.paymentStatus) {
      updateData.paymentStatus = body.paymentStatus;
    }

    // Handle payment method update
    if (body.paymentMethod) {
      updateData.paymentMethod = body.paymentMethod;
    }

    // Handle paid amount update
    if (body.paidAmount !== undefined) {
      updateData.paidAmount = String(body.paidAmount);
      
      // Auto-update payment status based on paid amount
      const total = parseFloat(existingOrder.total);
      if (body.paidAmount >= total) {
        updateData.paymentStatus = "paid";
      } else if (body.paidAmount > 0) {
        updateData.paymentStatus = "partial";
      }
    }

    // Handle notes update
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Update the order
    const [updatedOrder] = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

      // Log status change if status was updated
      if (body.status && body.status !== existingOrder.status) {
        await tx.insert(orderStatusHistory).values({
          orderId: id,
          fromStatus: existingOrder.status,
          toStatus: body.status,
          changedBy: session.user.id,
          notes: body.statusNotes || null,
        });
      }

      return [updated];
    });

    // Convert decimal strings to numbers
    const orderResponse = {
      ...updatedOrder,
      subtotal: parseFloat(updatedOrder.subtotal),
      discount: parseFloat(updatedOrder.discount),
      total: parseFloat(updatedOrder.total),
      paidAmount: parseFloat(updatedOrder.paidAmount),
    };

    // Send email notification for status changes
    if (body.status && body.status !== existingOrder.status) {
      const statusEmailTemplates: Record<string, string> = {
        ready: "orderReady",
        completed: "orderCompleted",
      };

      const templateName = statusEmailTemplates[body.status];
      if (templateName) {
        sendTemplatedEmail(
          existingOrder.customerPhone + "@s.whatsapp.net", // In production, get real email
          templateName,
          {
            orderNumber: existingOrder.orderNumber,
            customerName: existingOrder.customerName,
          }
        ).catch((err) => {
          console.error("Failed to send status email:", err);
        });
      }
    }

    return NextResponse.json({ order: orderResponse });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Cancel/delete an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Fetch the existing order
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, id), inArray(orders.branchId, userBranchIds))
      );

    if (!existingOrder) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    // Only allow cancellation of pending orders
    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Hanya order dengan status pending yang dapat dibatalkan" },
        { status: 400 }
      );
    }

    // Cancel the order (soft delete by setting status to cancelled)
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));

      // Log status change
      await tx.insert(orderStatusHistory).values({
        orderId: id,
        fromStatus: existingOrder.status,
        toStatus: "cancelled",
        changedBy: session.user.id,
        notes: "Order dibatalkan",
      });

      // Revert customer stats if customerId exists
      if (existingOrder.customerId) {
        const total = parseFloat(existingOrder.total);
        await tx
          .update(customers)
          .set({
            totalOrders: sql`GREATEST(0, ${customers.totalOrders} - 1)`,
            totalSpent: sql`GREATEST(0, ${customers.totalSpent} - ${total})`,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingOrder.customerId));
      }
    });

    return NextResponse.json({ message: "Order berhasil dibatalkan" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
