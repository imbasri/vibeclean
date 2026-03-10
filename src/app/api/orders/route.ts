import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  services,
  customers,
  organizationMembers,
  branchPermissions,
  organizations,
  branches,
  subscriptions,
} from "@/lib/db";
import { eq, and, inArray, desc, or, ilike, sql, gte } from "drizzle-orm";
import { createOrderSchema } from "@/lib/validations/schemas";

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

// Helper to generate order number
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

// Plan limits configuration
const planLimits = {
  starter: { ordersPerMonth: 100 },
  pro: { ordersPerMonth: Infinity },
  enterprise: { ordersPerMonth: Infinity },
} as const;

// Helper to check subscription order limit
async function checkOrderLimit(branchId: string): Promise<{
  allowed: boolean;
  message?: string;
  currentCount?: number;
  limit?: number | "Unlimited";
}> {
  try {
    // Get branch's organization
    const [branch] = await db
      .select({ organizationId: branches.organizationId })
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) {
      return { allowed: true }; // Fail open
    }

    // Get organization and subscription
    const [organization] = await db
      .select({
        id: organizations.id,
        plan: organizations.plan,
      })
      .from(organizations)
      .where(eq(organizations.id, branch.organizationId));

    if (!organization) {
      return { allowed: true };
    }

    const plan = organization.plan as keyof typeof planLimits;
    const limits = planLimits[plan] || planLimits.starter;

    // Unlimited plans always allowed
    if (limits.ordersPerMonth === Infinity) {
      return { allowed: true, limit: "Unlimited" };
    }

    // Get subscription for accurate count
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organization.id));

    // Get all branches for this organization
    const orgBranches = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.organizationId, organization.id));

    const branchIds = orgBranches.map((b) => b.id);

    // Count orders this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let ordersThisMonth = 0;
    if (branchIds.length > 0) {
      const [orderCount] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, startOfMonth)
          )
        );
      ordersThisMonth = orderCount?.count || 0;
    }

    // Use subscription's count if available (more accurate)
    const currentCount = subscription?.monthlyOrderCount || ordersThisMonth;

    if (currentCount >= limits.ordersPerMonth) {
      return {
        allowed: false,
        message: `Kuota transaksi bulan ini sudah habis (${currentCount}/${limits.ordersPerMonth}). Upgrade ke paket Pro untuk transaksi unlimited.`,
        currentCount,
        limit: limits.ordersPerMonth,
      };
    }

    return {
      allowed: true,
      currentCount,
      limit: limits.ordersPerMonth,
    };
  } catch (error) {
    console.error("Error checking order limit:", error);
    return { allowed: true }; // Fail open on error
  }
}

// Helper to increment order count in subscription
async function incrementSubscriptionOrderCount(branchId: string): Promise<void> {
  try {
    const [branch] = await db
      .select({ organizationId: branches.organizationId })
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) return;

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, branch.organizationId));

    if (!subscription) {
      // Create subscription record if doesn't exist
      const [organization] = await db
        .select({ plan: organizations.plan, subscriptionStatus: organizations.subscriptionStatus })
        .from(organizations)
        .where(eq(organizations.id, branch.organizationId));

      if (organization) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        await db.insert(subscriptions).values({
          organizationId: branch.organizationId,
          plan: organization.plan,
          status: organization.subscriptionStatus as "active" | "trial" | "expired" | "cancelled",
          price: "0",
          billingCycle: "monthly",
          monthlyOrderCount: 1,
          lastOrderCountReset: startOfMonth,
        });
      }
      return;
    }

    // Check if we need to reset monthly count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const lastReset = subscription.lastOrderCountReset || new Date(0);
    const shouldReset = lastReset < startOfMonth;

    if (shouldReset) {
      await db
        .update(subscriptions)
        .set({
          monthlyOrderCount: 1,
          lastOrderCountReset: startOfMonth,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));
    } else {
      await db
        .update(subscriptions)
        .set({
          monthlyOrderCount: (subscription.monthlyOrderCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));
    }
  } catch (error) {
    console.error("Error incrementing subscription order count:", error);
    // Don't fail the order creation if this fails
  }
}

// GET /api/orders - List orders for user's branches
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get user's accessible branches
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (userBranchIds.length === 0) {
      return NextResponse.json({ orders: [], total: 0 });
    }

    // Filter by specific branch or all user's branches
    const targetBranchIds =
      branchId && userBranchIds.includes(branchId)
        ? [branchId]
        : userBranchIds;

    // Build base query
    let result = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        branchId: orders.branchId,
        customerId: orders.customerId,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        subtotal: orders.subtotal,
        discount: orders.discount,
        discountType: orders.discountType,
        discountReason: orders.discountReason,
        total: orders.total,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        paidAmount: orders.paidAmount,
        notes: orders.notes,
        estimatedCompletionAt: orders.estimatedCompletionAt,
        completedAt: orders.completedAt,
        createdBy: orders.createdBy,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(inArray(orders.branchId, targetBranchIds))
      .orderBy(desc(orders.createdAt));

    // Apply filters in memory (simpler for now)
    let filteredResult = result;

    if (status && status !== "all") {
      filteredResult = filteredResult.filter((o) => o.status === status);
    }

    if (paymentStatus && paymentStatus !== "all") {
      filteredResult = filteredResult.filter(
        (o) => o.paymentStatus === paymentStatus
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredResult = filteredResult.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchLower) ||
          o.customerName.toLowerCase().includes(searchLower) ||
          o.customerPhone.includes(search)
      );
    }

    // Calculate pagination
    const total = filteredResult.length;
    const offset = (page - 1) * limit;
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    // Convert decimal strings to numbers
    const ordersWithNumberValues = paginatedResult.map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discount: parseFloat(o.discount),
      total: parseFloat(o.total),
      paidAmount: parseFloat(o.paidAmount),
    }));

    return NextResponse.json({
      orders: ordersWithNumberValues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { branchId, customerId, ...orderData } = body;

    // Validate order data
    const validationResult = createOrderSchema.safeParse(orderData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validData = validationResult.data;

    // Verify user has access to the branch
    const userBranchIds = await getUserBranchIds(session.user.id);

    if (!branchId || !userBranchIds.includes(branchId)) {
      return NextResponse.json(
        { error: "Akses ke cabang ini tidak diizinkan" },
        { status: 403 }
      );
    }

    // Check subscription order limit
    const limitCheck = await checkOrderLimit(branchId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: limitCheck.message || "Kuota transaksi habis",
          code: "ORDER_LIMIT_REACHED",
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
        },
        { status: 403 }
      );
    }

    // Fetch services to get prices and validate
    const serviceIds = validData.items.map((item) => item.serviceId);
    const fetchedServices = await db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
        unit: services.unit,
        estimatedDays: services.estimatedDays,
        isActive: services.isActive,
        branchId: services.branchId,
      })
      .from(services)
      .where(inArray(services.id, serviceIds));

    // Validate all services exist, are active, and belong to the branch
    const serviceMap = new Map(fetchedServices.map((s) => [s.id, s]));
    for (const item of validData.items) {
      const service = serviceMap.get(item.serviceId);
      if (!service) {
        return NextResponse.json(
          { error: `Layanan dengan ID ${item.serviceId} tidak ditemukan` },
          { status: 400 }
        );
      }
      if (!service.isActive) {
        return NextResponse.json(
          { error: `Layanan "${service.name}" tidak aktif` },
          { status: 400 }
        );
      }
      if (service.branchId !== branchId) {
        return NextResponse.json(
          { error: `Layanan "${service.name}" bukan milik cabang ini` },
          { status: 400 }
        );
      }
    }

    // Calculate subtotal and estimate
    let subtotal = 0;
    let maxEstimatedDays = 0;
    const orderItemsData = validData.items.map((item) => {
      const service = serviceMap.get(item.serviceId)!;
      const pricePerUnit = parseFloat(service.price);
      const itemSubtotal = pricePerUnit * item.quantity;
      subtotal += itemSubtotal;
      maxEstimatedDays = Math.max(maxEstimatedDays, service.estimatedDays);
      return {
        serviceId: item.serviceId,
        serviceName: service.name,
        quantity: String(item.quantity),
        unit: service.unit,
        pricePerUnit: service.price,
        subtotal: String(itemSubtotal),
        notes: item.notes || null,
      };
    });

    // Calculate discount
    let discountAmount = 0;
    if (validData.discount && validData.discountType) {
      if (validData.discountType === "percentage") {
        discountAmount = (subtotal * validData.discount) / 100;
      } else {
        discountAmount = validData.discount;
      }
    }

    const total = Math.max(0, subtotal - discountAmount);

    // Calculate estimated completion
    const estimatedCompletionAt = new Date();
    estimatedCompletionAt.setDate(
      estimatedCompletionAt.getDate() + maxEstimatedDays
    );

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order and items in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          branchId,
          customerId: customerId || null,
          customerName: validData.customerName,
          customerPhone: validData.customerPhone,
          subtotal: String(subtotal),
          discount: String(discountAmount),
          discountType: validData.discountType || null,
          discountReason: validData.discountReason || null,
          couponCode: validData.couponCode || null,
          total: String(total),
          status: "pending",
          paymentStatus: "unpaid",
          paymentMethod: validData.paymentMethod || null,
          paidAmount: "0",
          notes: validData.notes || null,
          estimatedCompletionAt,
          createdBy: session.user.id,
        })
        .returning();

      // Create order items
      const itemsToInsert = orderItemsData.map((item) => ({
        orderId: newOrder.id,
        ...item,
      }));

      const insertedItems = await tx
        .insert(orderItems)
        .values(itemsToInsert)
        .returning();

      // Create initial status history
      await tx.insert(orderStatusHistory).values({
        orderId: newOrder.id,
        fromStatus: null,
        toStatus: "pending",
        changedBy: session.user.id,
        notes: "Order dibuat",
      });

      // Update customer stats if customerId is provided
      if (customerId) {
        await tx
          .update(customers)
          .set({
            totalOrders: sql`${customers.totalOrders} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${total}`,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));
      }

      return { order: newOrder, items: insertedItems };
    });

    // Increment subscription order count (non-blocking)
    incrementSubscriptionOrderCount(branchId).catch((err) => {
      console.error("Failed to increment order count:", err);
    });

    // Convert decimal strings to numbers for response
    const orderResponse = {
      ...result.order,
      subtotal: parseFloat(result.order.subtotal),
      discount: parseFloat(result.order.discount),
      total: parseFloat(result.order.total),
      paidAmount: parseFloat(result.order.paidAmount),
      items: result.items.map((item) => ({
        ...item,
        quantity: parseFloat(item.quantity),
        pricePerUnit: parseFloat(item.pricePerUnit),
        subtotal: parseFloat(item.subtotal),
      })),
    };

    return NextResponse.json({ order: orderResponse }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
