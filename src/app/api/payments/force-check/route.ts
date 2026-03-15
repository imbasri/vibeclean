import { NextRequest, NextResponse } from 'next/server';
import { db, orders } from '@/lib/db';
import { eq } from 'drizzle-orm';

// POST /api/payments/force-check - Force check payment status from Mayar API and update if paid
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
        message: 'Order sudah lunas',
      });
    }

    // Check payment status from Mayar API
    console.log('[Force Check] Checking Mayar API for payment status...', {
      orderId: order.id,
      mayarPaymentId: order.mayarPaymentId,
      mayarTransactionId: order.mayarTransactionId,
    });

    try {
      // Try to get payment status from Mayar using payment ID
      const mayarPaymentId = order.mayarPaymentId;
      
      if (!mayarPaymentId) {
        console.warn('[Force Check] No Mayar payment ID found for order');
        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus,
            isPaid: false,
            isExpired: false,
            paidAt: null,
            amount: order.total,
            mayarTransactionId: order.mayarTransactionId,
          },
          message: 'Order belum memiliki Mayar payment ID',
        });
      }

      // Call Mayar API to get payment status
      // Note: This requires MAYAR_API_KEY to be set
      const MAYAR_API_BASE_URL = process.env.MAYAR_API_BASE_URL || 'https://sandbox-api.mayar.id/hl/v1';
      const MAYAR_API_KEY = process.env.MAYAR_API_KEY;

      if (!MAYAR_API_KEY) {
        console.error('[Force Check] MAYAR_API_KEY not configured');
        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus,
            isPaid: false,
            isExpired: false,
            paidAt: null,
            amount: order.total,
            mayarTransactionId: order.mayarTransactionId,
          },
          message: 'MAYAR_API_KEY not configured. Cannot check Mayar API.',
        });
      }

      const mayarResponse = await fetch(`${MAYAR_API_BASE_URL}/payment/${mayarPaymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MAYAR_API_KEY}`,
        },
      });

      if (!mayarResponse.ok) {
        console.error('[Force Check] Mayar API error:', mayarResponse.status, mayarResponse.statusText);
        throw new Error(`Mayar API error: ${mayarResponse.status}`);
      }

      const mayarData = await mayarResponse.json();
      console.log('[Force Check] Mayar API response:', mayarData);

      const paymentData = mayarData.data;
      const isPaid = paymentData?.status === 'SUCCESS' || 
                     paymentData?.transactionStatus === 'paid' ||
                     paymentData?.status === 'PAID';

      if (isPaid) {
        // Update order to paid
        const paidAt = paymentData?.paidAt 
          ? new Date(paymentData.paidAt)
          : new Date();
        
        await db
          .update(orders)
          .set({
            paymentStatus: 'paid',
            paidAt,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        console.log('[Force Check] ✓ Order updated to PAID:', order.orderNumber);

        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            paymentStatus: 'paid',
            isPaid: true,
            isExpired: false,
            paidAt,
            amount: order.total,
            mayarTransactionId: order.mayarTransactionId,
          },
          message: 'Payment status updated from Mayar API',
        });
      } else {
        console.log('[Force Check] Payment still pending in Mayar:', paymentData?.status);
        
        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus,
            isPaid: false,
            isExpired: paymentData?.status === 'EXPIRED',
            paidAt: null,
            amount: order.total,
            mayarTransactionId: order.mayarTransactionId,
          },
          message: 'Payment masih pending di Mayar',
        });
      }
    } catch (mayarError) {
      console.error('[Force Check] Mayar API error:', mayarError);
      
      // Return current status from database with error info
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          isPaid: false,
          isExpired: false,
          paidAt: null,
          amount: order.total,
          mayarTransactionId: order.mayarTransactionId,
        },
        message: 'Gagal check status dari Mayar API. Silakan tunggu webhook atau hubungi support.',
        mayarError: mayarError instanceof Error ? mayarError.message : 'Unknown error',
      });
    }
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
