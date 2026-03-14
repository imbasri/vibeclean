import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { getTransactionFeeSettings, updateTransactionFeeSettings } from "@/lib/config/platform";

// GET /api/founder/settings - Get platform settings
export async function GET() {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const transactionFee = await getTransactionFeeSettings();

    return NextResponse.json({
      transactionFee,
    });
  } catch (error) {
    console.error("[Founder Settings API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/founder/settings - Update platform settings
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { transactionFee } = body;

    if (transactionFee) {
      await updateTransactionFeeSettings(transactionFee);
    }

    const updatedSettings = await getTransactionFeeSettings();

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: {
        transactionFee: updatedSettings,
      },
    });
  } catch (error) {
    console.error("[Founder Settings API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
