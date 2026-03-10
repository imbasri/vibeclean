/**
 * Mayar Payment Gateway Client
 * 
 * API Documentation: https://docs.mayar.id
 * 
 * This client handles:
 * - Invoice creation (for detailed orders)
 * - Payment request creation (for simple payments)
 * - QRIS dynamic QR code generation
 * - Webhook verification
 */

import type {
  MayarResponse,
  MayarCreateInvoiceRequest,
  MayarInvoiceData,
  MayarCreatePaymentRequest,
  MayarPaymentData,
  MayarCreateQRISRequest,
  MayarQRISData,
  MayarWebhookPayload,
  PaymentRequest,
  PaymentResponse,
} from "@/types/mayar";

// ============================================
// CONFIGURATION
// ============================================

const MAYAR_API_BASE_URL = "https://api.mayar.id/hl/v1";
const MAYAR_API_KEY = process.env.MAYAR_API_KEY;
const MAYAR_WEBHOOK_SECRET = process.env.MAYAR_WEBHOOK_SECRET;
const REDIRECT_URL = process.env.NEXT_PUBLIC_MAYAR_REDIRECT_URL || "http://localhost:3000/payment/success";

// Default expiration time: 24 hours
const DEFAULT_EXPIRATION_MINUTES = 24 * 60;

// ============================================
// ERROR HANDLING
// ============================================

export class MayarError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiMessage?: string
  ) {
    super(message);
    this.name = "MayarError";
  }
}

// ============================================
// API CLIENT
// ============================================

async function mayarFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<MayarResponse<T>> {
  if (!MAYAR_API_KEY) {
    throw new MayarError(
      "MAYAR_API_KEY is not configured",
      500,
      "Missing API key"
    );
  }

  const url = `${MAYAR_API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${MAYAR_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || data.statusCode !== 200) {
    throw new MayarError(
      `Mayar API Error: ${data.messages || response.statusText}`,
      data.statusCode || response.status,
      data.messages
    );
  }

  return data;
}

// ============================================
// INVOICE FUNCTIONS
// ============================================

/**
 * Create an invoice for a customer order
 * Best for: Detailed orders with multiple items
 */
export async function createInvoice(
  request: MayarCreateInvoiceRequest
): Promise<MayarInvoiceData> {
  const response = await mayarFetch<MayarInvoiceData>("/invoice/create", {
    method: "POST",
    body: JSON.stringify(request),
  });

  return response.data;
}

/**
 * Create a simple payment request
 * Best for: Single amount payments without item breakdown
 */
export async function createPayment(
  request: MayarCreatePaymentRequest
): Promise<MayarPaymentData> {
  const response = await mayarFetch<MayarPaymentData>("/payment/create", {
    method: "POST",
    body: JSON.stringify(request),
  });

  return response.data;
}

// ============================================
// QRIS FUNCTIONS
// ============================================

/**
 * Create a dynamic QRIS QR code
 * Note: This is a simple QRIS without customer details
 */
export async function createQRIS(amount: number): Promise<MayarQRISData> {
  const request: MayarCreateQRISRequest = { amount };

  const response = await mayarFetch<MayarQRISData>("/qrcode/create", {
    method: "POST",
    body: JSON.stringify(request),
  });

  return response.data;
}

// ============================================
// WEBHOOK FUNCTIONS
// ============================================

/**
 * Register a webhook URL
 * Call this once to set up webhook notifications
 */
export async function registerWebhook(urlHook: string): Promise<void> {
  await mayarFetch("/webhook/register", {
    method: "POST",
    body: JSON.stringify({ urlHook }),
  });
}

/**
 * Verify webhook signature
 * TODO: Implement proper HMAC verification when Mayar provides documentation
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!MAYAR_WEBHOOK_SECRET) {
    console.warn("MAYAR_WEBHOOK_SECRET not configured, skipping verification");
    return true;
  }

  // For now, we'll do a simple secret check
  // Mayar should provide proper HMAC verification
  // This is a placeholder that should be updated based on Mayar's actual implementation
  return signature === MAYAR_WEBHOOK_SECRET;
}

/**
 * Parse webhook payload
 */
export function parseWebhookPayload(body: string): MayarWebhookPayload {
  try {
    return JSON.parse(body) as MayarWebhookPayload;
  } catch {
    throw new MayarError("Invalid webhook payload", 400, "Failed to parse JSON");
  }
}

// ============================================
// HIGH-LEVEL PAYMENT FUNCTIONS
// ============================================

/**
 * Create a payment for an order
 * This is the main function to use for POS checkout
 */
export async function createOrderPayment(
  request: PaymentRequest
): Promise<PaymentResponse> {
  try {
    const expiredAt = new Date();
    expiredAt.setMinutes(
      expiredAt.getMinutes() + (request.expiredInMinutes || DEFAULT_EXPIRATION_MINUTES)
    );

    // Use invoice for detailed tracking
    const invoiceRequest: MayarCreateInvoiceRequest = {
      name: request.customerName,
      email: request.customerEmail || `${request.orderId}@guest.vibeclean.id`,
      mobile: request.customerPhone,
      redirectUrl: `${REDIRECT_URL}?orderId=${request.orderId}`,
      description: request.description || `Pembayaran Order #${request.orderId}`,
      expiredAt: expiredAt.toISOString(),
      items: [
        {
          quantity: 1,
          rate: request.amount,
          description: request.description || `Order Laundry #${request.orderId}`,
        },
      ],
      extraData: {
        orderId: request.orderId,
      },
    };

    const invoice = await createInvoice(invoiceRequest);

    // If QRIS is requested, also generate QR code
    let qrCodeUrl: string | undefined;
    if (request.paymentType === "qris") {
      try {
        const qris = await createQRIS(request.amount);
        qrCodeUrl = qris.url;
      } catch (error) {
        // QRIS generation failed, but invoice is still valid
        console.error("Failed to generate QRIS:", error);
      }
    }

    return {
      success: true,
      paymentId: invoice.id,
      transactionId: invoice.transactionId,
      paymentUrl: invoice.link,
      qrCodeUrl,
      expiredAt: new Date(invoice.expiredAt),
    };
  } catch (error) {
    if (error instanceof MayarError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Failed to create payment",
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if Mayar is properly configured
 */
export function isMayarConfigured(): boolean {
  return !!MAYAR_API_KEY;
}

/**
 * Format amount for display (Indonesian Rupiah)
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
