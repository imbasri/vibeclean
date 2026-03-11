/**
 * Email Service using Resend
 * 
 * Provides transactional email capabilities for VibeClean
 * 
 * Security:
 * - API key stored in environment variables
 * - Email validation before sending
 * - Rate limiting handled by Resend
 * - Error logging for debugging
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@vibeclean.id";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "VibeClean";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send email using Resend
 * Returns result with messageId for success, or error message for failure
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  // Check if Resend is configured
  if (!resend) {
    console.warn("[Email] Resend not configured. Email not sent.");
    return { 
      success: false, 
      error: "Email service not configured" 
    };
  }

  // Validate recipients
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  
  for (const recipient of recipients) {
    if (!isValidEmail(recipient)) {
      console.error(`[Email] Invalid email address: ${recipient}`);
      return { 
        success: false, 
        error: `Invalid email address: ${recipient}` 
      };
    }
  }

  try {
    const data = await resend.emails.send({
      from: options.from 
        ? `${options.from} <${FROM_EMAIL}>` 
        : `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });

    if (data.error) {
      console.error("[Email] Resend error:", data.error);
      return { 
        success: false, 
        error: data.error.message 
      };
    }

    console.log(`[Email] Sent successfully to ${recipients.join(", ")}`);
    return { 
      success: true, 
      messageId: data.data?.id 
    };
  } catch (error) {
    console.error("[Email] Unexpected error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Send email with template
 */
export async function sendTemplatedEmail(
  to: string | string[],
  templateName: string,
  variables: Record<string, string>
): Promise<EmailResult> {
  const template = getTemplate(templateName, variables);
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Get email template
 */
function getTemplate(
  name: string, 
  variables: Record<string, string>
): { subject: string; html: string; text: string } {
  const templates: Record<string, () => { subject: string; html: string; text: string }> = {
    orderCreated: () => ({
      subject: `📋 Pesanan ${variables.orderNumber} Diterima - VibeClean`,
      html: getOrderCreatedEmailHtml(variables),
      text: getOrderCreatedEmailText(variables),
    }),
    orderReady: () => ({
      subject: `👋 Pesanan ${variables.orderNumber} Siap Diambil! - VibeClean`,
      html: getOrderReadyEmailHtml(variables),
      text: getOrderReadyEmailText(variables),
    }),
    orderCompleted: () => ({
      subject: `🎉 Pesanan ${variables.orderNumber} Selesai - VibeClean`,
      html: getOrderCompletedEmailHtml(variables),
      text: getOrderCompletedEmailText(variables),
    }),
    subscriptionActive: () => ({
      subject: `🚀 Langganan Pro Anda Aktif! - VibeClean`,
      html: getSubscriptionActiveEmailHtml(variables),
      text: getSubscriptionActiveEmailText(variables),
    }),
  };

  const templateFn = templates[name];
  if (!templateFn) {
    throw new Error(`Unknown template: ${name}`);
  }

  return templateFn();
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function getOrderCreatedEmailHtml(v: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesanan Diterima</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 60px; height: 60px; background: #3b82f6; border-radius: 12px; line-height: 60px; font-size: 28px;">📋</div>
      <h1 style="margin: 20px 0 10px; color: #1f2937;">Pesanan Diterima</h1>
      <p style="color: #6b7280; margin: 0;">Nomor Order: <strong>${v.orderNumber}</strong></p>
    </div>
    
    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h2 style="margin: 0 0 15px; font-size: 16px; color: #374151;">Detail Pesanan</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Pelanggan</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${v.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Total</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${v.total}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Status</td>
          <td style="padding: 8px 0; text-align: right;"><span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px;">Diterima</span></td>
        </tr>
      </table>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Estimasi selesai: <strong>${v.estimatedDate}</strong>
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Powered by <strong>VibeClean</strong> - Platform Manajemen Laundry
      </p>
    </div>
  </body>
</html>
  `.trim();
}

function getOrderCreatedEmailText(v: Record<string, string>): string {
  return `
Pesanan Diterima - VibeClean

Nomor Order: ${v.orderNumber}

Detail Pesanan:
- Pelanggan: ${v.customerName}
- Total: ${v.total}
- Estimasi Selesai: ${v.estimatedDate}

Powered by VibeClean
  `.trim();
}

function getOrderReadyEmailHtml(v: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesanan Siap Diambil</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 60px; height: 60px; background: #10b981; border-radius: 12px; line-height: 60px; font-size: 28px;">👋</div>
      <h1 style="margin: 20px 0 10px; color: #1f2937;">Pesanan Siap Diambil!</h1>
      <p style="color: #6b7280; margin: 0;">Nomor Order: <strong>${v.orderNumber}</strong></p>
    </div>
    
    <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #a7f3d0;">
      <p style="margin: 0; color: #065f46;">
        Hai <strong>${v.customerName}</strong>! Pesanan laundry Anda sudah selesai dan siap untuk diambil.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Silakan datang ke outlet untuk mengambil pesanan Anda.
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Powered by <strong>VibeClean</strong> - Platform Manajemen Laundry
      </p>
    </div>
  </body>
</html>
  `.trim();
}

function getOrderReadyEmailText(v: Record<string, string>): string {
  return `
Pesanan Siap Diambil! - VibeClean

Nomor Order: ${v.orderNumber}

Hai ${v.customerName}! Pesanan laundry Anda sudah selesai dan siap untuk diambil.

Silakan datang ke outlet untuk mengambil pesanan Anda.

Powered by VibeClean
  `.trim();
}

function getOrderCompletedEmailHtml(v: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesanan Selesai</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 60px; height: 60px; background: #8b5cf6; border-radius: 12px; line-height: 60px; font-size: 28px;">🎉</div>
      <h1 style="margin: 20px 0 10px; color: #1f2937;">Terima Kasih!</h1>
      <p style="color: #6b7280; margin: 0;">Pesanan <strong>${v.orderNumber}</strong> telah selesai</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Terima kasih telah mempercayakan laundry Anda kepada kami. Sampai jumpa lagi!
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Powered by <strong>VibeClean</strong> - Platform Manajemen Laundry
      </p>
    </div>
  </body>
</html>
  `.trim();
}

function getOrderCompletedEmailText(v: Record<string, string>): string {
  return `
Pesanan Selesai - VibeClean

Nomor Order: ${v.orderNumber}

Terima kasih telah mempercayakan laundry Anda kepada kami. Sampai jumpa lagi!

Powered by VibeClean
  `.trim();
}

function getSubscriptionActiveEmailHtml(v: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Langganan Aktif</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 60px; height: 60px; background: #f59e0b; border-radius: 12px; line-height: 60px; font-size: 28px;">🚀</div>
      <h1 style="margin: 20px 0 10px; color: #1f2937;">Langganan Pro Aktif!</h1>
      <p style="color: #6b7280; margin: 0;">Selamat! Langganan Anda sudah aktif</p>
    </div>
    
    <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fcd34d;">
      <h2 style="margin: 0 0 15px; font-size: 16px; color: #92400e;">Detail Langganan</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #92400e;">Paket</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${v.planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400e;">Berlaku Sampai</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500;">${v.expiryDate}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Sekarang Anda bisa menikmati fitur Pro! 😊
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Powered by <strong>VibeClean</strong> - Platform Manajemen Laundry
      </p>
    </div>
  </body>
</html>
  `.trim();
}

function getSubscriptionActiveEmailText(v: Record<string, string>): string {
  return `
Langganan Pro Aktif! - VibeClean

Halo ${v.ownerName}!

Selamat! Langganan ${v.planName} Anda sudah aktif.

Berlaku sampai: ${v.expiryDate}

Sekarang Anda bisa menikmati fitur Pro!

Powered by VibeClean
  `.trim();
}

export default {
  sendEmail,
  sendTemplatedEmail,
};
