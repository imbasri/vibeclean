import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { db, withdrawals } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/founder/withdrawals/[id]/reject - Reject a withdrawal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // Get withdrawal
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id));

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending withdrawals can be rejected" },
        { status: 400 }
      );
    }

    // Update withdrawal status
    await db
      .update(withdrawals)
      .set({
        status: "rejected" as any,
        processedAt: new Date(),
        rejectedReason: reason,
      })
      .where(eq(withdrawals.id, id));

    // TODO: Notify user about rejection

    return NextResponse.json({
      success: true,
      message: "Withdrawal rejected",
    });
  } catch (error) {
    console.error("[Reject Withdrawal] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
