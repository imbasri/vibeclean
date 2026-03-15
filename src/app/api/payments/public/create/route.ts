import { NextRequest, NextResponse } from 'next/server';
import {
    db,
    branches,
    organizations,
    orders,
    orderItems,
    orderStatusHistory,
} from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createOrderPayment, isMayarConfigured } from '@/lib/mayar';
import {
    calculateTransactionFee,
    getTransactionFeeSettings,
} from '@/lib/config/platform';
import { z } from 'zod';

// Request validation schema
const createPublicPaymentSchema = z
    .object({
        branchId: z.string().uuid().optional(),
        orderId: z.string().uuid().optional(),
        amount: z.number().positive().optional(),
        customerName: z.string().optional().default('Pelanggan'),
        customerPhone: z.string().optional().default('08000000000'),
        items: z
            .array(
                z.object({
                    name: z.string(),
                    quantity: z.number().positive(),
                    price: z.number().positive(),
                }),
            )
            .optional()
            .default([]),
        paymentMethod: z
            .enum(['cash', 'qris', 'transfer', 'ewallet'])
            .optional()
            .default('qris'),
        discount: z.number().optional(),
        couponCode: z.string().optional(),
    })
    .refine(
        (data) => {
            // Either orderId is provided (regenerate payment for existing order)
            // OR branchId is provided (create new order with payment)
            return data.orderId || data.branchId;
        },
        {
            message: 'Either orderId or branchId must be provided',
            path: ['branchId'],
        },
    );

function generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

// POST /api/payments/public/create - Create a payment without authentication
export async function POST(request: NextRequest) {
    console.log('[PublicPayment] ========== START ==========');
    try {
        console.log('[PublicPayment] Checking Mayar configuration...');
        // Check if Mayar is configured
        if (!isMayarConfigured()) {
            console.error('[PublicPayment] Mayar not configured');
            return NextResponse.json(
                { error: 'Payment gateway is not configured' },
                { status: 503 },
            );
        }
        console.log('[PublicPayment] Mayar configured OK');

        const body = await request.json();

        // Validate request
        const validationResult = createPublicPaymentSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validationResult.error.issues,
                },
                { status: 400 },
            );
        }

        const {
            branchId,
            orderId,
            amount,
            customerName,
            customerPhone,
            items,
            paymentMethod,
            discount,
        } = validationResult.data;

        // Calculate total amount from items if not provided
        let totalAmount = amount;
        let subtotal = amount;

        if (!totalAmount && items && items.length > 0) {
            // Calculate from items
            subtotal = items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0,
            );
            totalAmount = subtotal - (discount || 0);
        }

        if (!totalAmount || totalAmount <= 0) {
            return NextResponse.json(
                {
                    error: 'Amount must be greater than 0. Provide amount or items with prices.',
                },
                { status: 400 },
            );
        }

        // Check if we're regenerating payment for existing order
        let existingOrder = null;
        let orderNumber = '';
        let branch = null;
        let organization = null;

        if (orderId) {
            // Get existing order
            const [order] = await db
                .select()
                .from(orders)
                .where(eq(orders.id, orderId));

            if (order) {
                existingOrder = order;
                orderNumber = order.orderNumber;

                // Get branch from order
                const [orderBranch] = await db
                    .select()
                    .from(branches)
                    .where(eq(branches.id, order.branchId));
                branch = orderBranch;

                // Get organization from branch
                if (branch) {
                    const [org] = await db
                        .select()
                        .from(organizations)
                        .where(eq(organizations.id, branch.organizationId));
                    organization = org;
                }
            }
        }

        // If no orderId, we need branchId to create a new order
        if (!branch && branchId) {
            // Get branch
            const [branchData] = await db
                .select()
                .from(branches)
                .where(eq(branches.id, branchId));
            branch = branchData;

            if (branch) {
                // Get organization
                const [org] = await db
                    .select()
                    .from(organizations)
                    .where(eq(organizations.id, branch.organizationId));
                organization = org;
            }
        }

        // Validate branch and organization exist
        if (!branch) {
            return NextResponse.json(
                { error: 'Branch not found' },
                { status: 404 },
            );
        }

        if (!organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 },
            );
        }

        // Generate new order number if not using existing order
        if (!orderNumber) {
            orderNumber = generateOrderNumber();
        }

        // Calculate transaction fee for founder
        const feeSettings = await getTransactionFeeSettings();
        const transactionFee = calculateTransactionFee(
            totalAmount,
            feeSettings,
        );

        // Calculate estimated completion (default: 3 days from now)
        const estimatedCompletionAt = new Date();
        estimatedCompletionAt.setDate(estimatedCompletionAt.getDate() + 3);

        let newOrder = existingOrder;

        // Create order in database only if not using existing order
        if (!newOrder) {
            const [createdOrder] = await db
                .insert(orders)
                .values({
                    orderNumber,
                    branchId: branch.id,
                    customerName,
                    customerPhone,
                    subtotal: String(subtotal),
                    discount: String(discount || 0),
                    total: String(totalAmount),
                    status: 'pending',
                    paymentStatus: 'unpaid',
                    paymentMethod: paymentMethod || 'qris',
                    paidAmount: '0',
                    transactionFee: String(transactionFee),
                    mayarPaymentId: '', // Will be updated after Mayar response
                    mayarTransactionId: '', // Will be updated after Mayar response
                    estimatedCompletionAt,
                    createdBy: organization.ownerId, // Use owner as createdBy (system user)
                })
                .returning();

            newOrder = createdOrder;
        } else {
            // Update existing order with new payment info
            await db
                .update(orders)
                .set({
                    paymentStatus: 'unpaid',
                    paymentMethod: paymentMethod || 'qris',
                    mayarPaymentId: '',
                    mayarTransactionId: '',
                    paymentUrl: '',
                    qrCodeUrl: '',
                    estimatedCompletionAt,
                })
                .where(eq(orders.id, newOrder.id));
        }

        // If there are items and it's a new order, create order items
        if (!existingOrder && items && items.length > 0) {
            const orderItemsData = items.map((item) => ({
                orderId: newOrder.id,
                serviceId: '00000000-0000-0000-0000-000000000000', // Dummy service for public payments
                serviceName: item.name,
                quantity: String(item.quantity),
                unit: 'pcs' as const,
                pricePerUnit: String(item.price),
                subtotal: String(item.price * item.quantity),
            }));

            await db.insert(orderItems).values(orderItemsData);
        }

        // Add status history for payment regeneration
        await db.insert(orderStatusHistory).values({
            orderId: newOrder.id,
            fromStatus: null,
            toStatus: 'pending',
            changedBy: organization.ownerId,
            notes: existingOrder
                ? 'Pembayaran QRIS digenerate ulang'
                : 'Order dibuat melalui pembayaran QRIS',
        });

        // Create payment via Mayar with order info
        console.log(
            '[PublicPayment] Creating Mayar payment for order:',
            newOrder.id,
            'amount:',
            totalAmount,
        );
        const paymentResult = await createOrderPayment({
            orderId: newOrder.id, // Use actual order ID
            amount: totalAmount,
            customerName,
            customerPhone,
            paymentType: paymentMethod === 'qris' ? 'qris' : 'invoice',
            description: `Pembayaran laundry di ${branch.name} - ${orderNumber}`,
            expiredInMinutes: 30,
            extraData: {
                orderId: newOrder.id,
                orderNumber,
                organizationId: organization.id,
                organizationName: organization.name,
                branchName: branch.name,
            },
        });
        console.log('[PublicPayment] Mayar payment result:', paymentResult);

        if (!paymentResult.success) {
            // Rollback - delete the order if payment creation fails
            await db.delete(orders).where(eq(orders.id, newOrder.id));

            return NextResponse.json(
                { error: paymentResult.error || 'Failed to create payment' },
                { status: 500 },
            );
        }

        // Update order with Mayar payment IDs
        await db
            .update(orders)
            .set({
                mayarPaymentId: paymentResult.paymentId,
                mayarTransactionId: paymentResult.transactionId,
                paymentUrl: paymentResult.paymentUrl,
                qrCodeUrl: paymentResult.qrCodeUrl,
                paymentExpiredAt: paymentResult.expiredAt
                    ? new Date(paymentResult.expiredAt)
                    : null,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, newOrder.id));

        return NextResponse.json({
            success: true,
            orderId: newOrder.id,
            orderNumber,
            paymentId: paymentResult.paymentId,
            transactionId: paymentResult.transactionId,
            paymentUrl: paymentResult.paymentUrl,
            qrCodeUrl: paymentResult.qrCodeUrl,
            expiredAt: paymentResult.expiredAt,
            transactionFee,
            branch: {
                id: branch.id,
                name: branch.name,
            },
            organization: {
                name: organization.name,
            },
        });
    } catch (error) {
        console.error('[PublicPayment] Error creating public payment:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to create payment', details: errorMessage },
            { status: 500 },
        );
    }
}
