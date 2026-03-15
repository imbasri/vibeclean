import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';

// POST /api/orders/check-payment - Check order payment status from Mayar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, transactionId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order from database
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if payment is successful
    const isPaid = order.paymentStatus === 'paid';
    const isExpired = order.paymentExpiredAt 
      ? new Date(order.paymentExpiredAt) < new Date() 
      : false;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        isPaid,
        isExpired,
        paidAt: order.paidAt,
        amount: order.total,
        mayarTransactionId: order.mayarTransactionId,
      },
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

// GET /api/orders/check-payment - For testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Payment check endpoint is active',
  });
}
