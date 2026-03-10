import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  coupons,
  couponUsages,
  organizationMembers,
  branchPermissions,
  branches,
  orders,
} from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
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

// POST /api/coupons/apply - Validate and calculate discount
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { code, orderAmount, customerPhone, serviceCategory, serviceId } = body;

    if (!code || !orderAmount) {
      return NextResponse.json(
        { error: "Kode kupon dan jumlah order wajib diisi" },
        { status: 400 }
      );
    }

    // Find coupon
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.organizationId, organizationId), eq(coupons.code, code.toUpperCase())))
      .limit(1);

    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }

    // Check if active
    if (!coupon.isActive) {
      return NextResponse.json({ error: "Kupon sudah tidak aktif" }, { status: 400 });
    }

    // Check valid dates
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return NextResponse.json({ error: "Kupon belum berlaku" }, { status: 400 });
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return NextResponse.json({ error: "Kupon sudah kedaluwarsa" }, { status: 400 });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "Kuota kupon sudah habis" }, { status: 400 });
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < parseFloat(coupon.minOrderAmount)) {
      return NextResponse.json(
        {
          error: `Minimal order Rp ${parseFloat(coupon.minOrderAmount).toLocaleString("id-ID")} untuk menggunakan kupon ini`,
        },
        { status: 400 }
      );
    }

    // Check scope (category or service specific)
    if (coupon.scope === "category" && serviceCategory) {
      if (coupon.category !== serviceCategory) {
        return NextResponse.json(
          { error: `Kupon ini hanya berlaku untuk layanan kategori ${coupon.category}` },
          { status: 400 }
        );
      }
    }
    if (coupon.scope === "service" && serviceId) {
      if (coupon.serviceId !== serviceId) {
        return NextResponse.json({ error: "Kupon ini tidak berlaku untuk layanan ini" }, { status: 400 });
      }
    }

    // Calculate discount
    const couponValue = parseFloat(coupon.value);
    let discount = 0;

    if (coupon.type === "percentage") {
      discount = (orderAmount * couponValue) / 100;
      // Apply max discount cap if set
      if (coupon.maxDiscount && discount > parseFloat(coupon.maxDiscount)) {
        discount = parseFloat(coupon.maxDiscount);
      }
    } else {
      // Fixed discount
      discount = couponValue;
    }

    // Ensure discount doesn't exceed order amount
    discount = Math.min(discount, orderAmount);

    return NextResponse.json({
      success: true,
      discount,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: couponValue,
        description: coupon.description,
      },
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return NextResponse.json({ error: "Failed to apply coupon" }, { status: 500 });
  }
}
