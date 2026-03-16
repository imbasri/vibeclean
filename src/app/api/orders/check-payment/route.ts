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

  console.log(`[CheckPayment] Transaction fee for order ${order.orderNumber}: Rp ${transactionFee} (type: ${feeSettings.feeType}, value: ${feeSettings.feeValue}%)`);

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
      notes: `Pembayaran diterima via cek polling - Rp ${grossAmount.toLocaleString('id-ID')} (fee: Rp ${transactionFee})`,
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

      console.log(`[CheckPayment] Balance updated for org ${organizationId}: +Rp ${netAmountForOwner}`);
    }
  });

  console.log(`[CheckPayment] Order ${order.orderNumber} marked as PAID`);
}

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

    console.log(`[CheckPayment] Checking payment for order: ${orderId}`);

    // Get order from database
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      console.log(`[CheckPayment] Order not found: ${orderId}`);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log(`[CheckPayment] Order found: ${order.orderNumber}, status: ${order.paymentStatus}`);

    // If already paid in database, return immediately
    if (order.paymentStatus === 'paid') {
      const isExpired = order.paymentExpiredAt
        ? new Date(order.paymentExpiredAt) < new Date()
        : false;

      console.log(`[CheckPayment] Order already paid, returning from database`);
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          isPaid: true,
          isExpired,
          paidAt: order.paidAt,
          amount: order.total,
          mayarTransactionId: order.mayarTransactionId,
        },
        source: 'database',
      });
    }

    // Check with Mayar API if we have payment ID
    let mayarIsPaid = false;
    let mayarError = false;
    
    if (order.mayarPaymentId) {
      const mayarPaymentId = order.mayarPaymentId;
      try {
        console.log(`[CheckPayment] Checking Mayar for payment: ${mayarPaymentId}`);
        const mayarStatus = await getInvoiceStatus(mayarPaymentId);
        mayarIsPaid = mayarStatus.isPaid;
        console.log(`[CheckPayment] Mayar status for ${order.mayarPaymentId}:`, mayarStatus);
      } catch (error) {
        // Log error but don't fail - Mayar API might return errors for already-paid invoices
        mayarError = true;
        console.warn(`[CheckPayment] Mayar API error (non-fatal): ${error instanceof Error ? error.message : error}`);
      }
    }

    // Update order if Mayar says PAID but database says unpaid
    if (mayarIsPaid) {
      console.log(`[CheckPayment] Mayar reports paid, updating order...`);
      const grossAmount = parseFloat(order.total);
      await updateOrderToPaid(order, grossAmount);
    }

    // Get updated order
    const [updatedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    const isPaid = updatedOrder.paymentStatus === 'paid';
    const isExpired = updatedOrder.paymentExpiredAt
      ? new Date(updatedOrder.paymentExpiredAt) < new Date()
      : false;

    const source = mayarIsPaid ? 'mayar_updated' : (mayarError ? 'database_mayar_error' : 'database');
    
    console.log(`[CheckPayment] Returning result: isPaid=${isPaid}, source=${source}`);

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
        isPaid,
        isExpired,
        paidAt: updatedOrder.paidAt,
        amount: updatedOrder.total,
        mayarTransactionId: updatedOrder.mayarTransactionId,
      },
      source,
    });
  } catch (error) {
    console.error('[CheckPayment] Unexpected error:', error);
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
