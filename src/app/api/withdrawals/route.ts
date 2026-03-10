import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  withdrawals,
  organizations,
  organizationMembers,
  branchPermissions,
  orders,
  branches,
} from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Helper to get user's organization ID
async function getUserOrganizationId(userId: string): Promise<string | null> {
  const membership = await db
    .select({
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organizationId || null;
}

// Helper to check if user is owner
async function isOwnerInOrganization(userId: string): Promise<boolean> {
  const ownerPermission = await db
    .select({
      role: branchPermissions.role,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(branchPermissions.role, "owner")
      )
    )
    .limit(1);

  return ownerPermission.length > 0;
}

// Helper to calculate organization balance
async function getOrganizationBalance(organizationId: string): Promise<{
  totalRevenue: number;
  totalWithdrawn: number;
  availableBalance: number;
  pendingBalance: number;
}> {
  // For simplicity, we'll start with a default balance
  // In production, this would calculate from actual completed orders
  return {
    totalRevenue: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    pendingBalance: 0,
  };
}

// Request validation schema
const createWithdrawalSchema = z.object({
  amount: z.number().positive().min(50000, "Minimal penarikan Rp 50.000"),
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  bankAccountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  bankAccountName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
  notes: z.string().optional(),
});

// Minimum withdrawal amount
const MIN_WITHDRAWAL_AMOUNT = 50000;

// GET /api/withdrawals - List withdrawals and balance
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const isOwner = await isOwnerInOrganization(session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat melihat riwayat penarikan" },
        { status: 403 }
      );
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get balance
    const balance = await getOrganizationBalance(organizationId);

    // Get withdrawal history
    const withdrawalHistory = await db
      .select({
        id: withdrawals.id,
        amount: withdrawals.amount,
        fee: withdrawals.fee,
        netAmount: withdrawals.netAmount,
        status: withdrawals.status,
        bankName: withdrawals.bankName,
        bankAccountNumber: withdrawals.bankAccountNumber,
        bankAccountName: withdrawals.bankAccountName,
        notes: withdrawals.notes,
        rejectedReason: withdrawals.rejectedReason,
        requestedAt: withdrawals.requestedAt,
        processedAt: withdrawals.processedAt,
        completedAt: withdrawals.completedAt,
      })
      .from(withdrawals)
      .where(eq(withdrawals.organizationId, organizationId))
      .orderBy(desc(withdrawals.requestedAt))
      .limit(20);

    return NextResponse.json({
      balance,
      withdrawals: withdrawalHistory.map((w) => ({
        ...w,
        amount: parseFloat(w.amount),
        fee: parseFloat(w.fee),
        netAmount: parseFloat(w.netAmount),
      })),
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

// POST /api/withdrawals - Create a withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const isOwner = await isOwnerInOrganization(session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat mengajukan penarikan" },
        { status: 403 }
      );
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check for pending withdrawals
    const [pendingWithdrawal] = await db
      .select({ id: withdrawals.id })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.organizationId, organizationId),
          eq(withdrawals.status, "pending")
        )
      )
      .limit(1);

    if (pendingWithdrawal) {
      return NextResponse.json(
        { error: "Anda sudah memiliki permintaan penarikan yang pending" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request
    const validationResult = createWithdrawalSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { amount, bankName, bankAccountNumber, bankAccountName, notes } = validationResult.data;

    // Check minimum amount
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      return NextResponse.json(
        { error: `Minimal penarikan Rp ${MIN_WITHDRAWAL_AMOUNT.toLocaleString("id-ID")}` },
        { status: 400 }
      );
    }

    // Check balance
    const balance = await getOrganizationBalance(organizationId);

    if (amount > balance.availableBalance) {
      return NextResponse.json(
        {
          error: "Saldo tidak cukup",
          availableBalance: balance.availableBalance,
          requestedAmount: amount,
        },
        { status: 400 }
      );
    }

    // Calculate fee (e.g., Rp 5,000 or 1% whichever is higher, max Rp 10,000)
    const feePercentage = amount * 0.01;
    const fee = Math.min(Math.max(5000, feePercentage), 10000);
    const netAmount = amount - fee;

    // Create withdrawal request
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        organizationId,
        amount: String(amount),
        fee: String(fee),
        netAmount: String(netAmount),
        status: "pending",
        bankName,
        bankAccountNumber,
        bankAccountName,
        notes,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Permintaan penarikan telah submitted",
        withdrawal: {
          ...withdrawal,
          amount,
          fee,
          netAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to create withdrawal" },
      { status: 500 }
    );
  }
}
