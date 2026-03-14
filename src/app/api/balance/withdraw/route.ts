import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, organizationBalances, balanceTransactions, organizations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

const withdrawalSchema = z.object({
  amount: z.number().positive(),
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  bankAccountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  bankAccountName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
});

// POST /api/balance/withdraw - Request withdrawal
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request
    const validationResult = withdrawalSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { amount, bankName, bankAccountNumber, bankAccountName } = validationResult.data;

    // Get user's organization
    const [member] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, session.user.id))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const organizationId = member.id;

    // Get current balance
    let [balance] = await db
      .select()
      .from(organizationBalances)
      .where(eq(organizationBalances.organizationId, organizationId));

    if (!balance) {
      return NextResponse.json(
        { error: "Saldo tidak tersedia" },
        { status: 400 }
      );
    }

    const availableBalance = parseFloat(balance.availableBalance || "0");

    // Check if balance is sufficient
    if (availableBalance < amount) {
      return NextResponse.json(
        { error: `Saldo tidak cukup. Saldo tersedia: Rp ${availableBalance.toLocaleString("id-ID")}` },
        { status: 400 }
      );
    }

    // Create withdrawal transaction and update balance
    await db.transaction(async (tx) => {
      // Deduct from available balance
      const newAvailableBalance = availableBalance - amount;
      const newTotalWithdrawn = parseFloat(balance!.totalWithdrawn || "0") + amount;

      await tx
        .update(organizationBalances)
        .set({
          availableBalance: String(newAvailableBalance),
          totalWithdrawn: String(newTotalWithdrawn),
          updatedAt: new Date(),
        })
        .where(eq(organizationBalances.organizationId, organizationId));

      // Create withdrawal transaction record
      const [transaction] = await tx.insert(balanceTransactions).values({
        organizationId,
        type: "withdrawal",
        status: "pending", // Could be "completed" if using auto-disbursement
        amount: String(amount),
        feeAmount: "0",
        netAmount: String(amount),
        description: `Penarikan ke ${bankName} - Rekening ${bankAccountNumber} (${bankAccountName})`,
        referenceId: `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        completedAt: new Date(),
      }).returning();

      // Note: In production, you would integrate with a payment provider
      // like Mayar or bank API to actually transfer the money
      
      console.log(`[Withdrawal] Created withdrawal request for org ${organizationId}: Rp ${amount} to ${bankName} ${bankAccountNumber}`);
    });

    return NextResponse.json({
      success: true,
      message: `Penarikan Rp ${amount.toLocaleString("id-ID")} berhasil diproses. Saldo akan ditransfer ke rekening ${bankName} ${bankAccountNumber} dalam 1-3 hari kerja.`,
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to process withdrawal" },
      { status: 500 }
    );
  }
}
