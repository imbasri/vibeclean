import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  coupons,
  organizationMembers,
  branchPermissions,
} from "@/lib/db";
import { eq, and, desc, sql, like, ilike } from "drizzle-orm";
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

// Helper to check if user has manager role
async function hasManagerRole(userId: string): Promise<boolean> {
  const permissions = await db
    .select({
      role: branchPermissions.role,
    })
    .from(organizationMembers)
    .innerJoin(
      branchPermissions,
      eq(branchPermissions.memberId, organizationMembers.id)
    )
    .where(eq(organizationMembers.userId, userId));

  return permissions.some((p) => p.role === "owner" || p.role === "manager");
}

// Validation schemas
const createCouponSchema = z.object({
  code: z.string().min(3, "Kode minimal 3 karakter").max(20, "Kode maksimal 20 karakter"),
  description: z.string().optional(),
  type: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.number().positive("Nilai diskon harus positif"),
  scope: z.enum(["all", "category", "service"]).default("all"),
  category: z.string().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  minOrderAmount: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  usageLimit: z.number().optional().nullable(),
  perUserLimit: z.number().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateCouponSchema = createCouponSchema.partial();

const applyCouponSchema = z.object({
  code: z.string().min(1, "Kode kupon wajib diisi"),
  orderAmount: z.number().positive(),
  customerPhone: z.string().optional(),
  serviceCategory: z.string().optional(),
  serviceId: z.string().uuid().optional(),
});

// GET /api/coupons - List coupons
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build query
    let query = db
      .select({
        id: coupons.id,
        code: coupons.code,
        description: coupons.description,
        type: coupons.type,
        value: coupons.value,
        scope: coupons.scope,
        category: coupons.category,
        serviceId: coupons.serviceId,
        minOrderAmount: coupons.minOrderAmount,
        maxDiscount: coupons.maxDiscount,
        usageLimit: coupons.usageLimit,
        usageCount: coupons.usageCount,
        perUserLimit: coupons.perUserLimit,
        validFrom: coupons.validFrom,
        validUntil: coupons.validUntil,
        isActive: coupons.isActive,
        createdAt: coupons.createdAt,
      })
      .from(coupons)
      .where(eq(coupons.organizationId, organizationId));

    let couponsList = await query.orderBy(desc(coupons.createdAt));

    // Filter by search
    if (search) {
      couponsList = couponsList.filter((c) =>
        c.code.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by active status
    if (isActive === "true") {
      couponsList = couponsList.filter((c) => c.isActive);
    } else if (!includeInactive) {
      couponsList = couponsList.filter((c) => c.isActive);
    }

    // Parse decimal values
    const parsedCoupons = couponsList.map((c) => ({
      ...c,
      value: parseFloat(c.value),
      minOrderAmount: c.minOrderAmount ? parseFloat(c.minOrderAmount) : null,
      maxDiscount: c.maxDiscount ? parseFloat(c.maxDiscount) : null,
    }));

    return NextResponse.json({ coupons: parsedCoupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST /api/coupons - Create coupon
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
    const validationResult = createCouponSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if code already exists
    const [existing] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(and(eq(coupons.organizationId, organizationId), eq(coupons.code, data.code.toUpperCase())))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Kode kupon sudah digunakan" },
        { status: 400 }
      );
    }

    // Validate percentage value
    if (data.type === "percentage" && data.value > 100) {
      return NextResponse.json(
        { error: "Persentase diskon maksimal 100%" },
        { status: 400 }
      );
    }

    // Prepare values
    const couponValues = {
      organizationId,
      code: data.code.toUpperCase(),
      description: data.description || null,
      type: data.type,
      value: String(data.value),
      scope: data.scope || "all",
      category: data.category || null,
      serviceId: data.serviceId || null,
      minOrderAmount: data.minOrderAmount ? String(data.minOrderAmount) : null,
      maxDiscount: data.maxDiscount ? String(data.maxDiscount) : null,
      usageLimit: data.usageLimit || null,
      perUserLimit: data.perUserLimit || null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    console.log("[Coupon Create] Values:", couponValues);

    // Create coupon
    const [coupon] = await db
      .insert(coupons)
      .values(couponValues)
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Kupon berhasil dibuat",
        coupon: {
          ...coupon,
          value: parseFloat(coupon.value),
          minOrderAmount: coupon.minOrderAmount ? parseFloat(coupon.minOrderAmount) : null,
          maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

// PUT /api/coupons - Update coupon
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get ID from query params or request body
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get("id");
    
    const body = await request.json();
    const bodyId = body.id;
    const id = queryId || bodyId;
    const updateData = body.id ? body : { ...body, id: undefined };
    
    delete updateData.id; // Remove id from update data

    if (!id) {
      return NextResponse.json({ error: "Coupon ID required" }, { status: 400 });
    }

    const validationResult = updateCouponSchema.safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build update object
    const updateFields: Record<string, unknown> = { ...data, updatedAt: new Date() };

    if (data.value) updateFields.value = String(data.value);
    if (data.minOrderAmount) updateFields.minOrderAmount = String(data.minOrderAmount);
    if (data.maxDiscount) updateFields.maxDiscount = String(data.maxDiscount);
    if (data.validFrom) updateFields.validFrom = new Date(data.validFrom);
    if (data.validUntil) updateFields.validUntil = new Date(data.validUntil);

    const [coupon] = await db
      .update(coupons)
      .set(updateFields)
      .where(and(eq(coupons.id, id), eq(coupons.organizationId, organizationId)))
      .returning();

    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Kupon berhasil diperbarui",
      coupon: {
        ...coupon,
        value: parseFloat(coupon.value),
        minOrderAmount: coupon.minOrderAmount ? parseFloat(coupon.minOrderAmount) : null,
        maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null,
      },
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE /api/coupons - Delete coupon
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(coupons)
      .where(and(eq(coupons.id, id), eq(coupons.organizationId, organizationId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Kupon berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
