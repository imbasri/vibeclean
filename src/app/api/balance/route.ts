import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, organizationBalances, balanceTransactions, organizations } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// GET /api/balance - Get organization balance
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get balance
    let [balance] = await db
      .select()
      .from(organizationBalances)
      .where(eq(organizationBalances.organizationId, organizationId));

    // Create balance if doesn't exist
    if (!balance) {
      const [newBalance] = await db.insert(organizationBalances).values({
        organizationId,
        totalEarnings: "0",
        availableBalance: "0",
        pendingBalance: "0",
        totalWithdrawn: "0",
      }).returning();
      balance = newBalance;
    }

    // Get recent transactions
    const transactions = await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.organizationId, organizationId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(20);

    return NextResponse.json({
      balance: {
        totalEarnings: parseFloat(balance.totalEarnings || "0"),
        availableBalance: parseFloat(balance.availableBalance || "0"),
        pendingBalance: parseFloat(balance.pendingBalance || "0"),
        totalWithdrawn: parseFloat(balance.totalWithdrawn || "0"),
        lastTransactionAt: balance.lastTransactionAt,
      },
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: parseFloat(t.amount || "0"),
        feeAmount: parseFloat(t.feeAmount || "0"),
        netAmount: parseFloat(t.netAmount || "0"),
        description: t.description,
        referenceId: t.referenceId,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}