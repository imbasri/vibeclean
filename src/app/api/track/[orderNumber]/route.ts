import { NextRequest, NextResponse } from "next/server";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  branches,
  organizations,
  customers,
  memberSubscriptions,
  memberPackages,
} from "@/lib/db";
import { eq, and, desc, or, like, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderNumber } = await params;
    const searchParams = request.nextUrl.searchParams;
    const searchType = searchParams.get("type") || "order"; // "order" or "phone"

    if (!orderNumber || orderNumber.length < 2) {
      return NextResponse.json(
        { error: "Nomor order atau HP tidak valid" },
        { status: 400 }
      );
    }

    let order;
    
    if (searchType === "phone") {
      // Search by phone number - get latest order
      const phoneSearch = orderNumber.replace(/^0/, "62"); // Convert 08xx to 62xx
      
      const results = await db
        .select()
        .from(orders)
        .where(
          or(
            like(orders.customerPhone, `%${orderNumber}%`),
            like(orders.customerPhone, `%${phoneSearch}%`)
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(1);
      
      order = results[0];
      
      if (!order) {
        return NextResponse.json(
          { error: "Tidak ada pesanan dengan nomor HP tersebut" },
          { status: 404 }
        );
      }
    } else {
      // Search by order number (default)
      const searchOrderNumber = orderNumber.toUpperCase();

      [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, searchOrderNumber));

      if (!order) {
        return NextResponse.json(
          { error: "Order tidak ditemukan. Coba juga dengan nomor HP." },
          { status: 404 }
        );
      }
    }

    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, order.branchId));

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, branch?.organizationId || ""));

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(desc(orderStatusHistory.createdAt));

    // Get customer membership info
    let membershipInfo = null;
    const customerPhone = order.customerPhone?.replace(/^0/, "62");
    
    if (customerPhone) {
      // Find customer by phone
      const [customer] = await db
        .select()
        .from(customers)
        .where(
          or(
            like(customers.phone, `%${customerPhone}%`),
            like(customers.phone, `%${order.customerPhone}%`)
          )
        )
        .limit(1);

      if (customer) {
        // Check for active membership
        const now = new Date();
        const [subscription] = await db
          .select({
            id: memberSubscriptions.id,
            packageName: memberPackages.name,
            price: memberPackages.price,
            discountType: memberPackages.discountType,
            discountValue: memberPackages.discountValue,
            maxWeightKg: memberPackages.maxWeightKg,
            maxTransactionsPerMonth: memberPackages.maxTransactionsPerMonth,
            transactionsThisMonth: memberSubscriptions.transactionsThisMonth,
            endDate: memberSubscriptions.endDate,
          })
          .from(memberSubscriptions)
          .innerJoin(memberPackages, eq(memberSubscriptions.packageId, memberPackages.id))
          .where(
            and(
              eq(memberSubscriptions.customerId, customer.id),
              eq(memberSubscriptions.organizationId, branch?.organizationId || ""),
              eq(memberSubscriptions.status, "active"),
              sql`${memberSubscriptions.endDate} >= ${now}`
            )
          )
          .limit(1);

        if (subscription) {
          membershipInfo = {
            packageName: subscription.packageName,
            price: Number(subscription.price),
            discountType: subscription.discountType,
            discountValue: Number(subscription.discountValue),
            maxWeightKg: subscription.maxWeightKg ? Number(subscription.maxWeightKg) : null,
            maxTransactionsPerMonth: subscription.maxTransactionsPerMonth ? Number(subscription.maxTransactionsPerMonth) : null,
            transactionsThisMonth: subscription.transactionsThisMonth || 0,
            remainingTransactions: subscription.maxTransactionsPerMonth 
              ? Number(subscription.maxTransactionsPerMonth) - (subscription.transactionsThisMonth || 0)
              : null,
            endDate: subscription.endDate,
          };
        }
      }
    }

    const response = {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        total: parseFloat(order.total),
        paidAmount: parseFloat(order.paidAmount),
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        estimatedCompletionAt: order.estimatedCompletionAt,
        completedAt: order.completedAt,
        createdAt: order.createdAt,
        items: items.map((item) => ({
          ...item,
          quantity: parseFloat(item.quantity),
          pricePerUnit: parseFloat(item.pricePerUnit),
          subtotal: parseFloat(item.subtotal),
        })),
        statusHistory: history,
      },
      branch: branch
        ? {
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
          }
        : null,
      organization: organization
        ? {
            name: organization.name,
            logo: organization.logo,
          }
        : null,
      membership: membershipInfo,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Track order error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
