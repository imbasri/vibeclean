// ============================================
// MAYAR PAYMENT GATEWAY TYPES
// ============================================

/**
 * Mayar API Response wrapper
 */
export interface MayarResponse<T> {
  statusCode: number;
  messages: string;
  data: T;
}

// ============================================
// INVOICE TYPES
// ============================================

export interface MayarInvoiceItem {
  quantity: number;
  rate: number;
  description: string;
}

export interface MayarCreateInvoiceRequest {
  name: string;
  email: string;
  mobile: string;
  redirectUrl: string;
  description: string;
  expiredAt: string; // ISO 8601 format (UTC)
  items: MayarInvoiceItem[];
  extraData?: {
    orderId?: string;
    branchId?: string;
    [key: string]: string | undefined;
  };
}

export interface MayarInvoiceData {
  id: string;
  transactionId: string;
  link: string;
  expiredAt: number;
  extraData?: Record<string, string>;
}

// ============================================
// PAYMENT REQUEST TYPES
// ============================================

export interface MayarCreatePaymentRequest {
  name: string;
  email: string;
  mobile: string;
  amount: number;
  redirectUrl: string;
  description: string;
  expiredAt: string;
}

export interface MayarPaymentData {
  id: string;
  transaction_id: string;
  transactionId: string;
  link: string;
}

// ============================================
// QRIS (Dynamic QR Code) TYPES
// ============================================

export interface MayarCreateQRISRequest {
  amount: number;
}

export interface MayarQRISData {
  url: string; // QR Code image URL
  amount: number;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export type MayarWebhookEvent =
  | "payment.received"
  | "payment.expired"
  | "payment.failed"
  | "invoice.paid"
  | "invoice.expired";

export type MayarPaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "refunded";

export interface MayarWebhookPayload {
  event: MayarWebhookEvent;
  id: string;
  transactionId: string;
  status: MayarPaymentStatus;
  amount: number;
  nettAmount?: number;
  paidAt?: string;
  expiredAt?: string;
  paymentMethod?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  extraData?: Record<string, string>;
}

// ============================================
// INTERNAL PAYMENT TYPES
// ============================================

export type PaymentProvider = "mayar" | "manual";
export type PaymentType = "qris" | "va" | "invoice";

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  paymentType: PaymentType;
  description?: string;
  expiredInMinutes?: number;
  extraData?: Record<string, string>;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  expiredAt?: Date;
  error?: string;
}

export interface PaymentStatusCheck {
  paymentId: string;
  status: MayarPaymentStatus;
  paidAt?: Date;
  paymentMethod?: string;
}
