import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderStatusHistory, branches, organizationBalances, balanceTransactions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getInvoiceStatus } from '@/lib/mayar';
import { calculateTransactionFee, getTransactionFeeSettings } from '@/lib/config/platform';

async function updateOrderToPaid(order: typeof orders.$inferSelect, grossAmount: number) {
  const feeSettings = await getTransactionFeeSettings();
  const transactionFee = calculateTransactionFee(grossAmount, feeSettings);
  const netAmountForOwner = grossAmount - transactionFee;
  const paidAt = new Date();

  console.log(`[ForceCheck] Transaction fee for order ${order.orderNumber}: Rp ${transactionFee} (type: ${feeSettings.feeType}, value: ${feeSettings.feeValue}%)`);

  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, order.branchId));

  const organizationId = branch?.organizationId;

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        paymentStatus: 'paid',
        paidAmount: String(grossAmount),
        transactionFee: String(transactionFee),
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      changedBy: order.createdBy,
      notes: `Pembayaran diterima via manual force check - Rp ${grossAmount.toLocaleString('id-ID')} (fee: Rp ${transactionFee})`,
    });

    if (organizationId) {
      let [balance] = await tx
        .select()
        .from(organizationBalances)
        .where(eq(organizationBalances.organizationId, organizationId));

      if (!balance) {
        const [newBalance] = await tx.insert(organizationBalances).values({
          organizationId,
          totalEarnings: '0',
          availableBalance: '0',
          pendingBalance: '0',
          totalWithdrawn: '0',
        }).returning();
        balance = newBalance;
      }

      const currentTotalEarnings = parseFloat(balance.totalEarnings || '0');
      const currentAvailable = parseFloat(balance.availableBalance || '0');

      const newTotalEarnings = currentTotalEarnings + grossAmount;
      const newAvailableBalance = currentAvailable + netAmountForOwner;

      await tx
        .update(organizationBalances)
        .set({
          totalEarnings: String(newTotalEarnings),
          availableBalance: String(newAvailableBalance),
          lastTransactionAt: paidAt,
          updatedAt: paidAt,
        })
        .where(eq(organizationBalances.organizationId, organizationId));

      await tx.insert(balanceTransactions).values({
        organizationId,
        orderId: order.id,
        type: 'payment_received',
        status: 'completed',
        amount: String(grossAmount),
        feeAmount: String(transactionFee),
        netAmount: String(netAmountForOwner),
        description: `Pembayaran order ${order.orderNumber}`,
        completedAt: paidAt,
      });

      console.log(`[ForceCheck] Balance updated for org ${organizationId}: +Rp ${netAmountForOwner}`);
    }
  });

  console.log(`[ForceCheck] Order ${order.orderNumber} marked as PAID`);
}

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

      // Use common library function
      console.log(`[Force Check] Checking Mayar for payment: ${order.mayarPaymentId}`);
      const mayarStatus = await getInvoiceStatus(mayarPaymentId);
      const { isPaid, isExpired } = mayarStatus;
      console.log(`[Force Check] Mayar status for ${order.mayarPaymentId}:`, mayarStatus);

      if (isPaid) {
        console.log(`[Force Check] Mayar reports paid, updating order...`);
        const grossAmount = parseFloat(order.total);
        await updateOrderToPaid(order, grossAmount);
        
        // Get updated order
        const [updatedOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, order.id));

        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            paymentStatus: 'paid',
            isPaid: true,
            isExpired: false,
            paidAt: updatedOrder.paidAt,
            amount: order.total,
            mayarTransactionId: order.mayarTransactionId,
          },
          message: 'Payment status updated from Mayar API',
        });
      } else {
        console.log('[Force Check] Payment still pending in Mayar');
        
        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus,
            isPaid: false,
            isExpired: isExpired,
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
