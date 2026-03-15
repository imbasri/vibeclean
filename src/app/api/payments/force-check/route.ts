import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';

// POST /api/payments/force-check - Force check payment status from Mayar API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, transactionId } = body;

    if (!orderId && !transactionId) {
      return NextResponse.json(
        { error: 'Order ID or Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get order from database
    const [order] = await db
      .select()
      .from(orders)
      .where(
        transactionId 
          ? eq(orders.mayarTransactionId, transactionId)
          : eq(orders.id, orderId)
      );

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // If already paid, return immediately
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          isPaid: true,
          isExpired: false,
          paidAt: order.paidAt,
          amount: order.total,
          mayarTransactionId: order.mayarTransactionId,
        },
      });
    }

    // For now, just return current status
    // Mayar API status check requires specific endpoint that may vary
    // This endpoint is mainly for debugging and manual triggers
    console.log('[Force Check] Current order status:', {
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      mayarTransactionId: order.mayarTransactionId,
    });

    // Return current status from database
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        isPaid: false, // Will be updated by webhook
        isExpired: false,
        paidAt: order.paidAt,
        amount: order.total,
        mayarTransactionId: order.mayarTransactionId,
      },
    });
  } catch (error) {
    console.error('Error in force-check payment:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Force check payment endpoint is active',
  });
}
