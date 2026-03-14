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
  membershipTiers,
  customerMemberships,
  coupons,
  couponUsages,
} from "@/lib/db";
import { eq, and, inArray, desc, or, ilike, like, sql, gte } from "drizzle-orm";
import { createOrderSchema } from "@/lib/validations/schemas";
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

// Helper to award loyalty points
async function awardLoyaltyPoints(
  customerId: string,
  orderTotal: number,
  branchId: string
): Promise<{ pointsEarned: number; newTier?: string }> {
  try {
    // Get customer's current membership
    const [membership] = await db
      .select()
      .from(customerMemberships)
      .where(eq(customerMemberships.customerId, customerId));

    // Get branch's organization to find tiers
    const [branch] = await db
      .select({ organizationId: branches.organizationId })
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) return { pointsEarned: 0 };

    // Get all active tiers for the organization
    const tiers = await db
      .select()
      .from(membershipTiers)
      .where(
        and(
          eq(membershipTiers.organizationId, branch.organizationId),
          eq(membershipTiers.isActive, true)
        )
      )
      .orderBy(membershipTiers.minSpending);

    // Calculate points: 1 point per Rp 1,000 spent
    let pointsEarned = Math.floor(orderTotal / 1000);

    // Get multiplier from current tier
    let multiplier = 1;
    if (membership) {
      const currentTier = tiers.find((t) => t.id === membership.tierId);
      if (currentTier) {
        multiplier = Number(currentTier.pointMultiplier) || 1;
      }
    }

    pointsEarned = Math.floor(pointsEarned * multiplier);

    // Update customer points
    await db
      .update(customers)
      .set({
        loyaltyPoints: sql`${customers.loyaltyPoints} + ${pointsEarned}`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    // Check if customer qualifies for tier upgrade
    const [customer] = await db
      .select({ totalSpent: customers.totalSpent })
      .from(customers)
      .where(eq(customers.id, customerId));

    if (customer && tiers.length > 0) {
      const totalSpent = Number(customer.totalSpent);
      
      // Find highest tier customer qualifies for
      let newTierId: string | null = null;
      for (const tier of tiers) {
        if (totalSpent >= Number(tier.minSpending)) {
          newTierId = tier.id;
        } else {
          break;
        }
      }

      // Update tier if changed
      if (newTierId && newTierId !== membership?.tierId) {
        if (membership) {
          await db
            .update(customerMemberships)
            .set({ tierId: newTierId, updatedAt: new Date() })
            .where(eq(customerMemberships.customerId, customerId));
        } else {
          // Create new membership
          await db.insert(customerMemberships).values({
            customerId,
            tierId: newTierId,
            points: String(pointsEarned),
            totalSpent: String(orderTotal),
            totalOrders: 1,
          });
        }
      } else if (membership) {
        // Just update points
        await db
          .update(customerMemberships)
          .set({
            points: sql`${customerMemberships.points} + ${pointsEarned}`,
            totalSpent: sql`${customerMemberships.totalSpent} + ${orderTotal}`,
            totalOrders: sql`${customerMemberships.totalOrders} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(customerMemberships.customerId, customerId));
      }
    }

    return { pointsEarned };
  } catch (error) {
    console.error("Error awarding loyalty points:", error);
    return { pointsEarned: 0 };
  }
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

// Helper to record member subscription transaction
async function recordMemberTransaction(subscriptionId: string): Promise<void> {
  try {
    const { memberSubscriptions } = await import("@/lib/db");
    
    const [subscription] = await db
      .select()
      .from(memberSubscriptions)
      .where(eq(memberSubscriptions.id, subscriptionId));

    if (!subscription) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastReset = subscription.lastTransactionReset 
      ? new Date(subscription.lastTransactionReset) 
      : startOfMonth;
    
    const shouldReset = lastReset < startOfMonth;
    const currentCount = shouldReset ? 0 : (subscription.transactionsThisMonth || 0);

    await db
      .update(memberSubscriptions)
      .set({
        transactionsThisMonth: currentCount + 1,
        lastTransactionReset: shouldReset ? now : lastReset,
        updatedAt: now,
      })
      .where(eq(memberSubscriptions.id, subscriptionId));
  } catch (error) {
    console.error("Error recording member transaction:", error);
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

    // Fetch order items for paginated orders
    const orderIds = paginatedResult.map((o) => o.id);
    let orderItemsList: any[] = [];
    if (orderIds.length > 0) {
      orderItemsList = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          serviceId: orderItems.serviceId,
          serviceName: orderItems.serviceName,
          quantity: orderItems.quantity,
          unit: orderItems.unit,
          pricePerUnit: orderItems.pricePerUnit,
          subtotal: orderItems.subtotal,
          notes: orderItems.notes,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));
    }

    // Group items by orderId
    const itemsByOrderId = new Map<string, any[]>();
    for (const item of orderItemsList) {
      const orderId = item.orderId;
      if (!itemsByOrderId.has(orderId)) {
        itemsByOrderId.set(orderId, []);
      }
      itemsByOrderId.get(orderId)!.push({
        ...item,
        quantity: parseFloat(item.quantity),
        pricePerUnit: parseFloat(item.pricePerUnit),
        subtotal: parseFloat(item.subtotal),
      });
    }

    // Convert decimal strings to numbers and attach items
    const ordersWithNumberValues = paginatedResult.map((o) => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      discount: parseFloat(o.discount),
      total: parseFloat(o.total),
      paidAmount: parseFloat(o.paidAmount),
      items: itemsByOrderId.get(o.id) || [],
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
  console.log("[POS Order] ========== START ==========");
  
  try {
    console.log("[POS Order] Getting session...");
    const session = await getSession();
    console.log("[POS Order] Session result:", session ? `user: ${session.user.id}` : "null");

    if (!session?.user) {
      console.log("[POS Order] No session - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[POS Order] Reading request body...");
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("[POS Order] Failed to parse body:", e);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.log("[POS Order] Body received, keys:", Object.keys(body));
    
    const { branchId, customerId, ...orderData } = body;
    console.log("[POS Order] branchId:", branchId, "customerId:", customerId);

    // Validate order data
    console.log("[POS Order] Validating order data...");
    const validationResult = createOrderSchema.safeParse(orderData);
    console.log("[POS Order] Validation result:", validationResult.success ? "OK" : "FAILED");

    if (!validationResult.success) {
      console.log("[POS Order] Validation errors:", validationResult.error.issues);
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validData = validationResult.data;
    console.log("[POS Order] Validated data OK");

    // Find or create customer if saveAsCustomer is true
    let finalCustomerId = customerId;
    if (!finalCustomerId && validData.saveAsCustomer) {
      // Get branch to find organization
      const [branch] = await db
        .select({ organizationId: branches.organizationId })
        .from(branches)
        .where(eq(branches.id, branchId))
        .limit(1);
      
      // Search for existing customer by phone
      const phoneToSearch = validData.customerPhone.replace(/^0/, "62");
      const [existingCustomer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          or(
            eq(customers.phone, validData.customerPhone),
            eq(customers.phone, phoneToSearch)
          )
        )
        .limit(1);

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
      } else if (branch) {
        // Create new customer
        const [newCustomer] = await db
          .insert(customers)
          .values({
            name: validData.customerName,
            phone: validData.customerPhone,
            organizationId: branch.organizationId,
          })
          .returning();
        finalCustomerId = newCustomer.id;
      }
    }
    console.log("[POS Order] Final customer ID:", finalCustomerId);

    // Verify user has access to the branch
    const userBranchIds = await getUserBranchIds(session.user.id);
    console.log("[POS Order] User branch IDs:", userBranchIds);

    if (!branchId || !userBranchIds.includes(branchId)) {
      console.log("[POS Order] Access denied - branchId:", branchId, "userBranchIds:", userBranchIds);
      return NextResponse.json(
        { error: "Akses ke cabang ini tidak diizinkan" },
        { status: 403 }
      );
    }

    // Check subscription order limit
    console.log("[POS Order] Checking order limit for branch:", branchId);
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

    // Get organization ID for coupon validation
    const [branchInfo] = await db
      .select({ organizationId: branches.organizationId })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    const organizationId = branchInfo?.organizationId;

    // Calculate discount
    let discountAmount = 0;
    let memberDiscountAmount = 0;
    let memberSubscriptionId: string | null = null;
    let memberDiscountInfo: { type: string; value: number; name: string } | null = null;
    let appliedDiscountType: string | null = validData.discountType || null;
    let appliedDiscountReason: string | null = validData.discountReason || null;

    // Check for member discount first
    if (finalCustomerId && subtotal > 0) {
      try {
        const { memberSubscriptions, memberPackages } = await import("@/lib/db");
        const now = new Date();
        
        const memberSub = await db
          .select({
            id: memberSubscriptions.id,
            packageId: memberSubscriptions.packageId,
            transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
            maxTransactionsPerMonth: memberPackages.maxTransactionsPerMonth,
            discountType: memberPackages.discountType,
            discountValue: memberPackages.discountValue,
            maxWeightKg: memberPackages.maxWeightKg,
            name: memberPackages.name,
          })
          .from(memberSubscriptions)
          .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
          .where(and(
            eq(memberSubscriptions.customerId, customerId),
            eq(memberSubscriptions.status, "active"),
            sql`${memberSubscriptions.endDate} >= ${now}`
          ))
          .limit(1);

        if (memberSub.length > 0) {
          const sub = memberSub[0];
          const currentTransactions = sub.transactionsThisMonth || 0;
          
          // Check transaction limit
          const atLimit = sub.maxTransactionsPerMonth && 
            currentTransactions >= sub.maxTransactionsPerMonth;
          
          if (!atLimit) {
            // Calculate member discount
            if (sub.discountType === "percentage") {
              memberDiscountAmount = (subtotal * sub.discountValue) / 100;
            } else {
              memberDiscountAmount = Math.min(sub.discountValue, subtotal);
            }
            
            memberSubscriptionId = sub.id;
            memberDiscountInfo = {
              type: sub.discountType,
              value: sub.discountValue,
              name: sub.name,
            };
          }
        }
      } catch (err) {
        console.error("Error checking member discount:", err);
        // Continue without member discount
      }
    }

    // Apply coupon discount (server-side validation for security)
    let appliedCouponCode: string | null = null;
    if (validData.couponCode) {
      try {
        // Validate coupon server-side
        const [coupon] = await db
          .select()
          .from(coupons)
          .where(and(
            eq(coupons.organizationId, organizationId),
            eq(coupons.code, validData.couponCode.toUpperCase())
          ))
          .limit(1);

        if (!coupon) {
          return NextResponse.json(
            { error: "Kupon tidak ditemukan" },
            { status: 400 }
          );
        }

        if (!coupon.isActive) {
          return NextResponse.json(
            { error: "Kupon sudah tidak aktif" },
            { status: 400 }
          );
        }

        const now = new Date();
        if (coupon.validFrom && new Date(coupon.validFrom) > now) {
          return NextResponse.json(
            { error: "Kupon belum berlaku" },
            { status: 400 }
          );
        }

        if (coupon.validUntil && new Date(coupon.validUntil) < now) {
          return NextResponse.json(
            { error: "Kupon sudah kedaluwarsa" },
            { status: 400 }
          );
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          return NextResponse.json(
            { error: "Kuota kupon sudah habis" },
            { status: 400 }
          );
        }

        if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount)) {
          return NextResponse.json(
            { 
              error: `Minimal order Rp ${parseFloat(coupon.minOrderAmount).toLocaleString("id-ID")} untuk menggunakan kupon ini` 
            },
            { status: 400 }
          );
        }

        // Calculate coupon discount
        const couponValue = parseFloat(coupon.value);
        if (coupon.type === "percentage") {
          discountAmount = (subtotal * couponValue) / 100;
          // Apply max discount cap if set
          if (coupon.maxDiscount && discountAmount > parseFloat(coupon.maxDiscount)) {
            discountAmount = parseFloat(coupon.maxDiscount);
          }
        } else {
          discountAmount = Math.min(couponValue, subtotal);
        }

        appliedCouponCode = coupon.code;

        // Store discount type for display
        appliedDiscountType = coupon.type;
        appliedDiscountReason = `Kupon: ${coupon.code}`;
      } catch (couponErr) {
        console.error("Error validating coupon:", couponErr);
        // Continue without coupon if validation fails
      }
    } else if (validData.discount && validData.discountType) {
      // Manual discount (not from coupon) - only allow if no coupon code provided
      if (validData.discountType === "percentage") {
        discountAmount = (subtotal * validData.discount) / 100;
      } else {
        discountAmount = validData.discount;
      }
    }

    const total = Math.max(0, subtotal - memberDiscountAmount - discountAmount);

    // Calculate estimated completion
    const estimatedCompletionAt = new Date();
    estimatedCompletionAt.setDate(
      estimatedCompletionAt.getDate() + maxEstimatedDays
    );

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Handle cash payments - set as paid immediately and advance to processing
    const isCashPayment = validData.paymentMethod === "cash";
    const initialStatus = isCashPayment ? "processing" : "pending";
    const initialPaymentStatus = isCashPayment ? "paid" : "unpaid";

    // Create order and items in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          branchId,
          customerId: finalCustomerId || null,
          customerName: validData.customerName,
          customerPhone: validData.customerPhone,
          subtotal: String(subtotal),
          discount: String(discountAmount),
          discountType: appliedDiscountType,
          discountReason: appliedDiscountReason,
          couponCode: appliedCouponCode,
          total: String(total),
          status: initialStatus,
          paymentStatus: initialPaymentStatus,
          paymentMethod: validData.paymentMethod || null,
          paidAmount: isCashPayment ? String(total) : "0",
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
        toStatus: initialStatus,
        changedBy: session.user.id,
        notes: isCashPayment ? "Order dibuat - Pembayaran Tunai" : "Order dibuat",
      });

      // If cash payment, add another history entry showing transition
      if (isCashPayment) {
        await tx.insert(orderStatusHistory).values({
          orderId: newOrder.id,
          fromStatus: "pending",
          toStatus: "processing",
          changedBy: session.user.id, // Use actual user ID instead of "system"
          notes: "Pembayaran tunai - langsung diproses",
        });
      }

      // Track coupon usage if coupon was applied
      if (appliedCouponCode) {
        const [couponRecord] = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, appliedCouponCode))
          .limit(1);
        
        if (couponRecord) {
          await tx.insert(couponUsages).values({
            couponId: couponRecord.id,
            orderId: newOrder.id,
            userId: finalCustomerId || session.user.id,
            customerPhone: validData.customerPhone,
            discountAmount: String(discountAmount),
          });

          // Update coupon usage count
          await tx
            .update(coupons)
            .set({ usageCount: (couponRecord.usageCount || 0) + 1 })
            .where(eq(coupons.id, couponRecord.id));
        }
      }

      return { order: newOrder, items: insertedItems };
    });
    if (finalCustomerId) {
      await db
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${total}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, finalCustomerId));
    }
    
    if (finalCustomerId && initialPaymentStatus === "paid") {
      awardLoyaltyPoints(finalCustomerId, total, branchId).catch((err) => {
        console.error("Failed to award loyalty points:", err);
      });
    }

    // Increment subscription order count (non-blocking)
    incrementSubscriptionOrderCount(branchId).catch((err) => {
      console.error("Failed to increment order count:", err);
    });

    // Record member subscription transaction (non-blocking)
    if (memberSubscriptionId) {
      recordMemberTransaction(memberSubscriptionId).catch((err) => {
        console.error("Failed to record member transaction:", err);
      });
    }

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

    // Send email notification (fire and forget - don't block response)
    sendTemplatedEmail(
      orderResponse.customerPhone + "@s.whatsapp.net", // In production, get real email from customer
      "orderCreated",
      {
        orderNumber: orderResponse.orderNumber,
        customerName: orderResponse.customerName,
        total: `Rp ${orderResponse.total.toLocaleString("id-ID")}`,
        estimatedDate: new Date(orderResponse.estimatedCompletionAt).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }
    ).catch((err) => {
      console.error("Failed to send order email:", err);
    });

    return NextResponse.json({ order: orderResponse }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    return NextResponse.json(
      { error: "Failed to create order", details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}
