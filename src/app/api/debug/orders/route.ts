import { NextRequest, NextResponse } from "next/server";
import {
  db,
  orders,
} from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    let recentOrders;

    if (phone) {
      // Search by phone
      const phoneSearch = `%${phone}%`;
      recentOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerName: orders.customerName,
          customerPhone: orders.customerPhone,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.customerPhone, phoneSearch as any))
        .orderBy(desc(orders.createdAt))
        .limit(10);
    } else {
      recentOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerName: orders.customerName,
          customerPhone: orders.customerPhone,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(10);
    }

    return NextResponse.json({
      success: true,
      count: recentOrders.length,
      orders: recentOrders.map((o) => ({
        ...o,
        total: parseFloat(o.total),
        createdAt: o.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Debug orders error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server", details: String(error) },
      { status: 500 }
    );
  }
}
