import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getTransactionFeeSettings,
  updateTransactionFeeSettings,
  previewTransactionFee,
  type TransactionFeeSettings,
} from "@/lib/config/platform";
import { z } from "zod";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Validation schemas
const updateFeeSettingsSchema = z.object({
  feeType: z.enum(["fixed", "percentage"]).optional(),
  feeValue: z.number().positive().optional(),
  feeMin: z.number().min(0).optional(),
  feeMax: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

const previewFeeSchema = z.object({
  amount: z.number().positive(),
  feeType: z.enum(["fixed", "percentage"]).optional(),
  feeValue: z.number().positive().optional(),
  feeMin: z.number().min(0).optional(),
  feeMax: z.number().min(0).optional(),
});

// GET /api/settings/platform/fees - Get transaction fee settings
export async function GET() {
  try {
    const settings = await getTransactionFeeSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error fetching fee settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/platform/fees - Update transaction fee settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    // For now, allow any authenticated user to update
    // In production, you might want to restrict to admin only
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateFeeSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const newSettings = await updateTransactionFeeSettings(validationResult.data);

    return NextResponse.json({
      success: true,
      message: "Transaction fee settings updated",
      settings: newSettings,
    });
  } catch (error) {
    console.error("Error updating fee settings:", error);
    return NextResponse.json(
      { error: "Failed to update fee settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings/platform/fees/preview - Preview fee calculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = previewFeeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { amount, ...feeSettings } = validationResult.data;
    
    // If custom settings provided, use them for preview
    // Otherwise use current settings
    const settings: TransactionFeeSettings | undefined = Object.keys(feeSettings).length > 0
      ? {
          feeType: feeSettings.feeType || "percentage",
          feeValue: feeSettings.feeValue || 0.5,
          feeMin: feeSettings.feeMin ?? 500,
          feeMax: feeSettings.feeMax ?? 1000,
          enabled: true,
        }
      : undefined;

    const preview = previewTransactionFee(amount, settings);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error("Error previewing fee:", error);
    return NextResponse.json(
      { error: "Failed to preview fee" },
      { status: 500 }
    );
  }
}
