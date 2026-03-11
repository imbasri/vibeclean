import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { db, withdrawals } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/founder/withdrawals/[id]/approve - Approve a withdrawal
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
    const { notes } = body;

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
        { error: "Only pending withdrawals can be approved" },
        { status: 400 }
      );
    }

    // Update withdrawal status
    await db
      .update(withdrawals)
      .set({
        status: "completed" as any,
        processedAt: new Date(),
        notes: notes || "Approved by founder",
      })
      .where(eq(withdrawals.id, id));

    // TODO: Trigger Mayar withdrawal API here

    return NextResponse.json({
      success: true,
      message: "Withdrawal approved successfully",
    });
  } catch (error) {
    console.error("[Approve Withdrawal] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
