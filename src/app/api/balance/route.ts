import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, organizationBalances, balanceTransactions, organizations, organizationMembers } from "@/lib/db";
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

    const userId = session.user.id;

    // Get user's organization - check both as owner and as member
    let organization;
    
    // First, try to get organization where user is the owner
    [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, userId))
      .limit(1);

    // If not found as owner, check if user is a member of any organization
    if (!organization) {
      const [memberRecord] = await db
        .select({
          organizationId: organizationMembers.organizationId,
        })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId))
        .limit(1);

      if (memberRecord) {
        [organization] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, memberRecord.organizationId))
          .limit(1);
      }
    }

    if (!organization) {
      return NextResponse.json(
        { 
          error: "Organization not found",
          message: "Anda belum tergabung dengan organisasi laundry manapun. Silakan buat organisasi baru atau hubungi admin untuk diundang.",
          code: "NO_ORGANIZATION"
        }, 
        { status: 404 }
      );
    }

    const organizationId = organization.id;

    // Get balance - handle table not exists error
    let balance;
    try {
      [balance] = await db
        .select()
        .from(organizationBalances)
        .where(eq(organizationBalances.organizationId, organizationId));
    } catch (err) {
      console.error("Balance table error:", err);
      // Return empty balance if table doesn't exist
      return NextResponse.json({
        balance: {
          totalEarnings: 0,
          availableBalance: 0,
          pendingBalance: 0,
          totalWithdrawn: 0,
          lastTransactionAt: null,
        },
        transactions: [],
      });
    }

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

    // Get recent transactions - handle table not exists error
    let transactions: any[] = [];
    try {
      transactions = await db
        .select()
        .from(balanceTransactions)
        .where(eq(balanceTransactions.organizationId, organizationId))
        .orderBy(desc(balanceTransactions.createdAt))
        .limit(20);
    } catch (err) {
      console.error("Transactions table error:", err);
      // Return empty transactions if table doesn't exist
    }

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