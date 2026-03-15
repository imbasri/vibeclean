import { NextRequest, NextResponse } from "next/server";
import { db, orders, orderStatusHistory, subscriptions, subscriptionInvoices, organizations, organizationBalances, balanceTransactions, branches } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/mayar";
import { calculateTransactionFee, getTransactionFeeSettings } from "@/lib/config/platform";

// Note: Next.js App Router handles raw body natively via request.text()
// No special config needed

/**
 * Mayar Webhook Payload Structure (from docs):
 * {
 *   "event": "payment.received",
 *   "data": {
 *     "id": "transaction-id",
 *     "transactionId": "transaction-id",
 *     "status": "SUCCESS",
 *     "transactionStatus": "paid",
 *     "createdAt": "ISO timestamp",
 *     "updatedAt": "ISO timestamp",
 *     "merchantId": "...",
 *     "merchantName": "...",
 *     "customerName": "...",
 *     "customerEmail": "...",
 *     "customerMobile": "...",
 *     "amount": 10000,
 *     "paymentMethod": "QRIS",
 *     "nettAmount": 9500,
 *     ...
 *   }
 * }
 */

interface MayarWebhookData {
  event: string;
  data: {
    id: string;
    transactionId: string;
    status: string;
    transactionStatus?: string;
    createdAt: string;
    updatedAt: string;
    merchantId: string;
    merchantName: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    amount: number;
    nettAmount?: number;
    paymentMethod?: string;
    productId?: string;
    productName?: string;
    productType?: string;
    extraData?: Record<string, string>;
    custom_field?: Array<{
      key: string;
      value: string | number;
    }>;
  };
}

// POST /api/webhooks/mayar - Handle Mayar webhook callbacks
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    console.log("[Mayar Webhook] Raw body:", rawBody);
    
    // Get signature from headers (Mayar may use different header names)
    const signature = 
      request.headers.get("x-mayar-signature") ||
      request.headers.get("x-webhook-signature") ||
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      "";

    // Verify webhook signature (if configured)
    if (process.env.MAYAR_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Parse the webhook payload
    let webhookData: MayarWebhookData;
    try {
      // Mayar sends payload as stringified JSON in some cases
      const parsed = JSON.parse(rawBody);
      
      console.log("[Mayar Webhook] Parsed payload:", JSON.stringify(parsed).substring(0, 500));
      
      // Handle different Mayar payload formats
      // Format 1: Direct { event, data }
      // Format 2: { payload: "{...}" } - nested string
      // Format 3: { data: {...} } - Mayar might send data directly
      if (parsed.payload && typeof parsed.payload === "string") {
        webhookData = JSON.parse(parsed.payload);
      } else if (parsed.data && parsed.data.transactionId) {
        // Format with data wrapper
        webhookData = {
          event: parsed.event || "payment.received",
          data: parsed.data
        };
      } else if (parsed.transactionId) {
        // Direct transaction data
        webhookData = {
          event: parsed.event || "payment.received",
          data: parsed
        };
      } else {
        webhookData = parsed;
      }
    } catch {
      console.error("[Mayar Webhook] Failed to parse webhook payload:", rawBody);
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const { event, data } = webhookData;

    console.log(`[Mayar Webhook] Event: ${event}`, {
      transactionId: data?.transactionId,
      status: data?.status,
      amount: data?.amount,
    });

    // Handle different event types
    switch (event) {
      case "payment.received": {
        // Check if this is a subscription payment or order payment
        const paymentType = getPaymentType(data);
        
        if (paymentType === "subscription") {
          await handleSubscriptionPaymentReceived(data);
        } else {
          await handlePaymentReceived(data);
        }
        break;
      }
      case "payment.reminder": {
        // Log reminder, but no action needed
        console.log(`[Mayar Webhook] Payment reminder for transaction ${data?.transactionId}`);
        break;
      }
      default: {
        console.log(`[Mayar Webhook] Unhandled event type: ${event}`);
      }
    }

    // Always return success to Mayar
    return NextResponse.json({ 
      success: true,
      message: "Webhook received successfully"
    });
  } catch (error) {
    console.error("Error processing Mayar webhook:", error);
    // Still return 200 to prevent Mayar from retrying
    return NextResponse.json({ 
      success: false, 
      error: "Internal error but acknowledged" 
    });
  }
}

/**
 * Handle payment.received event
 * Update order status to PAID
 */
async function handlePaymentReceived(data: MayarWebhookData["data"]) {
  if (!data?.transactionId || data.status !== "SUCCESS") {
    console.log("[Mayar Webhook] Skipping - invalid data or not SUCCESS status");
    return;
  }

  // Find order by Mayar transaction ID or payment ID
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.mayarTransactionId, data.transactionId));

  // If not found by transactionId, try by paymentId
  if (!order) {
    const [orderByPaymentId] = await db
      .select()
      .from(orders)
      .where(eq(orders.mayarPaymentId, data.id));
    
    if (!orderByPaymentId) {
      console.log(`[Mayar Webhook] Order not found for transaction ${data.transactionId}`);
      
      // Try to find by extraData.orderId if available
      // This requires checking custom_field or extraData
      return;
    }
    
    await updateOrderToPaid(orderByPaymentId, data);
    return;
  }

  await updateOrderToPaid(order, data);
}

/**
 * Update order status to PAID
 */
async function updateOrderToPaid(
  order: typeof orders.$inferSelect,
  data: MayarWebhookData["data"]
) {
  // Skip if already paid
  if (order.paymentStatus === "paid") {
    console.log(`[Mayar Webhook] Order ${order.orderNumber} already paid, skipping`);
    return;
  }

  const paidAt = new Date(data.updatedAt || new Date().toISOString());
  const grossAmount = data.amount;
  const nettAmount = data.nettAmount || data.amount;
  
  // Map Mayar payment method to our enum
  let paymentMethod: "cash" | "qris" | "transfer" | "ewallet" = "qris";
  if (data.paymentMethod) {
    const method = data.paymentMethod.toLowerCase();
    if (method.includes("qris")) paymentMethod = "qris";
    else if (method.includes("va") || method.includes("transfer") || method.includes("bank")) paymentMethod = "transfer";
    else if (method.includes("ovo") || method.includes("gopay") || method.includes("dana") || method.includes("wallet")) paymentMethod = "ewallet";
  }

  // Calculate transaction fee for VibeClean founder
  const feeSettings = await getTransactionFeeSettings();
  const transactionFee = calculateTransactionFee(grossAmount, feeSettings);
  const netAmountForOwner = grossAmount - transactionFee;

  console.log(`[Mayar Webhook] Transaction fee for order ${order.orderNumber}: Rp ${transactionFee} (type: ${feeSettings.feeType}, value: ${feeSettings.feeValue}%)`);

  // Get branch to find organization
  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, order.branchId));

  const organizationId = branch?.organizationId;

  // Update order, add status history, and update organization balance
  await db.transaction(async (tx) => {
    // 1. Update order to paid
    await tx
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentMethod,
        paidAmount: String(nettAmount),
        transactionFee: String(transactionFee),
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // 2. Add status history
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status, // Status doesn't change, only payment status
      changedBy: order.createdBy, // Use order creator as system fallback
      notes: `Pembayaran diterima via ${data.paymentMethod || "Mayar"} - Rp ${nettAmount.toLocaleString("id-ID")} (fee: Rp ${transactionFee})`,
    });

    // 3. Update organization balance (if we have the organization)
    if (organizationId) {
      // Get or create balance record
      let [balance] = await tx
        .select()
        .from(organizationBalances)
        .where(eq(organizationBalances.organizationId, organizationId));

      if (!balance) {
        // Create balance record if doesn't exist
        const [newBalance] = await tx.insert(organizationBalances).values({
          organizationId,
          totalEarnings: "0",
          availableBalance: "0",
          pendingBalance: "0",
          totalWithdrawn: "0",
        }).returning();
        balance = newBalance;
      }

      // Calculate new balances
      const currentTotalEarnings = parseFloat(balance.totalEarnings || "0");
      const currentAvailable = parseFloat(balance.availableBalance || "0");

      const newTotalEarnings = currentTotalEarnings + grossAmount;
      const newAvailableBalance = currentAvailable + netAmountForOwner;

      // Update balance
      await tx
        .update(organizationBalances)
        .set({
          totalEarnings: String(newTotalEarnings),
          availableBalance: String(newAvailableBalance),
          lastTransactionAt: paidAt,
          updatedAt: paidAt,
        })
        .where(eq(organizationBalances.organizationId, organizationId));

      // 4. Record balance transaction
      await tx.insert(balanceTransactions).values({
        organizationId,
        orderId: order.id,
        type: "payment_received",
        status: "completed",
        amount: String(grossAmount),
        feeAmount: String(transactionFee),
        netAmount: String(netAmountForOwner),
        description: `Pembayaran order ${order.orderNumber}`,
        referenceId: data.transactionId,
        completedAt: paidAt,
      });

      console.log(`[Mayar Webhook] Balance updated for org ${organizationId}: +Rp ${netAmountForOwner} (gross: Rp ${grossAmount}, fee: Rp ${transactionFee})`);
    }
  });

  console.log(`[Mayar Webhook] Order ${order.orderNumber} marked as PAID with transaction fee Rp ${transactionFee}`);
}

/**
 * Determine if payment is for subscription or order
 * by checking custom_field or extraData
 */
function getPaymentType(data: MayarWebhookData["data"]): "subscription" | "order" {
  console.log("[Mayar Webhook] Determining payment type from:", JSON.stringify(data).substring(0, 300));
  
  // Check productName/description for subscription keywords
  if (data.productName) {
    const name = data.productName.toLowerCase();
    if (name.includes("langganan") || name.includes("subscription") || name.includes("paket") || name.includes("pro") || name.includes("enterprise")) {
      console.log("[Mayar Webhook] Detected as subscription based on productName");
      return "subscription";
    }
  }

  // Check description (items array might have description)
  if (data.productName && data.productName.toLowerCase().includes("vibeclean")) {
    console.log("[Mayar Webhook] Detected as subscription based on Vibeclean in productName");
    return "subscription";
  }
  
  // Check custom_field array
  if (data.custom_field) {
    const typeField = data.custom_field.find(
      (f) => f.key === "type" || f.key === "payment_type"
    );
    if (typeField?.value === "subscription") {
      console.log("[Mayar Webhook] Detected as subscription based on custom_field");
      return "subscription";
    }
    
    // Also check for organization_id in custom_field (subscription payments have this)
    const orgField = data.custom_field.find(
      (f) => f.key === "organization_id" || f.key === "orgId"
    );
    if (orgField) {
      console.log("[Mayar Webhook] Found organization_id in custom_field, treating as subscription");
      return "subscription";
    }
  }

  // Check extraData object
  if (data.extraData) {
    if (data.extraData.type === "subscription" || data.extraData.payment_type === "subscription") {
      console.log("[Mayar Webhook] Detected as subscription based on extraData");
      return "subscription";
    }
    
    // Check for organization_id in extraData
    if (data.extraData.organization_id || data.extraData.orgId) {
      console.log("[Mayar Webhook] Found organization_id in extraData, treating as subscription");
      return "subscription";
    }
  }

  // Check productType from Mayar
  if (data.productType?.toLowerCase().includes("subscription")) {
    console.log("[Mayar Webhook] Detected as subscription based on productType");
    return "subscription";
  }

  // Default to order payment
  console.log("[Mayar Webhook] Defaulting to order payment");
  return "order";
}

/**
 * Handle subscription payment received
 * Update subscription status to active and record invoice
 */
async function handleSubscriptionPaymentReceived(data: MayarWebhookData["data"]) {
  if (!data?.transactionId || data.status !== "SUCCESS") {
    console.log("[Mayar Webhook] Skipping subscription - invalid data or not SUCCESS status");
    return;
  }

  // Extract organization ID from custom_field or extraData
  let organizationId: string | null = null;
  let subscriptionId: string | null = null;
  let plan: "starter" | "pro" | "enterprise" | null = null;
  let billingCycle: "monthly" | "yearly" | null = null;

  // Check custom_field
  if (data.custom_field) {
    const orgField = data.custom_field.find(
      (f) => f.key === "organization_id" || f.key === "orgId"
    );
    if (orgField) {
      organizationId = String(orgField.value);
    }

    const subField = data.custom_field.find(
      (f) => f.key === "subscription_id" || f.key === "subscriptionId"
    );
    if (subField) {
      subscriptionId = String(subField.value);
    }

    // Extract plan and billingCycle from custom_field
    const planField = data.custom_field.find(
      (f) => f.key === "plan"
    );
    if (planField) {
      const planValue = String(planField.value);
      // Validate plan value
      if (["starter", "pro", "enterprise"].includes(planValue)) {
        plan = planValue as "starter" | "pro" | "enterprise";
      }
    }

    const billingCycleField = data.custom_field.find(
      (f) => f.key === "billingCycle" || f.key === "billing_cycle"
    );
    if (billingCycleField) {
      const billingCycleValue = String(billingCycleField.value);
      // Validate billing cycle value
      if (["monthly", "yearly"].includes(billingCycleValue)) {
        billingCycle = billingCycleValue as "monthly" | "yearly";
      }
    }
  }

  // Check extraData
  if (data.extraData) {
    organizationId = organizationId || data.extraData.organization_id || data.extraData.orgId || null;
    subscriptionId = subscriptionId || data.extraData.subscription_id || data.extraData.subscriptionId || null;
    
    // Extract and validate plan from extraData
    const planValue = data.extraData.plan;
    if (planValue && ["starter", "pro", "enterprise"].includes(planValue)) {
      plan = planValue as "starter" | "pro" | "enterprise";
    }
    
    // Extract and validate billingCycle from extraData
    const billingCycleValue = data.extraData.billingCycle || data.extraData.billing_cycle;
    if (billingCycleValue && ["monthly", "yearly"].includes(billingCycleValue)) {
      billingCycle = billingCycleValue as "monthly" | "yearly";
    }
  }

  if (!organizationId) {
    console.error("[Mayar Webhook] No organization ID found in subscription payment");
    return;
  }

  // Find subscription by ID or by organization
  let subscription;

  if (subscriptionId) {
    [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));
  }

  if (!subscription) {
    // Try finding by organization
    [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
  }

  if (!subscription) {
    console.error(`[Mayar Webhook] Subscription not found for org ${organizationId}`);
    return;
  }

  // Skip if we already have an invoice with this transaction ID
  const [existingInvoice] = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.mayarTransactionId, data.transactionId));

  if (existingInvoice) {
    console.log(`[Mayar Webhook] Invoice already exists for transaction ${data.transactionId}`);
    return;
  }

  const paidAt = new Date(data.updatedAt || new Date().toISOString());
  const nettAmount = data.nettAmount || data.amount;

  // Use plan from invoice data if available, otherwise keep existing
  const updatedPlan: "starter" | "pro" | "enterprise" = plan || subscription.plan;
  const updatedBillingCycle: "monthly" | "yearly" = billingCycle || (subscription.billingCycle as "monthly" | "yearly") || "monthly";

  // Calculate new billing period based on billing cycle
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  if (updatedBillingCycle === "yearly") {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  // Update subscription and create invoice in transaction
  await db.transaction(async (tx) => {
    // Update subscription to active with correct plan and period
    await tx
      .update(subscriptions)
      .set({
        status: "active",
        plan: updatedPlan,
        billingCycle: updatedBillingCycle,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    // Create invoice record
    await tx.insert(subscriptionInvoices).values({
      subscriptionId: subscription.id,
      organizationId: subscription.organizationId,
      invoiceNumber: `INV-${Date.now()}`,
      amount: String(data.amount),
      status: "paid",
      plan: updatedPlan,
      billingCycle: updatedBillingCycle,
      mayarTransactionId: data.transactionId,
      mayarPaymentId: data.id,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
      dueDate: currentPeriodStart,
      paidAt,
    });

    // Update organization's subscription plan
    await tx
      .update(organizations)
      .set({
        plan: updatedPlan,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, subscription.organizationId));
  });

  console.log(`[Mayar Webhook] Subscription ${subscription.id} activated for org ${organizationId} with plan ${updatedPlan}`);
}

// GET endpoint for webhook verification (some providers require this)
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    message: "Mayar webhook endpoint is active" 
  });
}
