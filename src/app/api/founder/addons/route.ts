import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { db, addonPurchases, addonProducts, organizations } from "@/lib/db";
import { eq, sql, desc, and } from "drizzle-orm";

// GET /api/founder/addons - Get all addon purchases
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause
    let whereConditions = [];
    
    if (type !== "all") {
      whereConditions.push(eq(addonProducts.type, type as any));
    }
    
    // Get purchases with organization and product info
    const results = await db
      .select({
        id: addonPurchases.id,
        organizationId: addonPurchases.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        productId: addonPurchases.productId,
        productName: addonProducts.name,
        productType: addonProducts.type,
        price: addonProducts.price,
        quota: addonProducts.quota,
        usedQuota: addonPurchases.whatsappUsed,
        status: addonPurchases.status,
        startedAt: addonPurchases.startDate,
        expiresAt: addonPurchases.endDate,
        createdAt: addonPurchases.createdAt,
      })
      .from(addonPurchases)
      .innerJoin(addonProducts, eq(addonPurchases.productId, addonProducts.id))
      .innerJoin(organizations, eq(addonPurchases.organizationId, organizations.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(addonPurchases.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Get total count
    const [{ total }] = await db
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(addonPurchases)
      .innerJoin(addonProducts, eq(addonPurchases.productId, addonProducts.id));

    // Get stats
    const [customDomainStats] = await db
      .select({
        active: sql<number>`COUNT(*) FILTER (WHERE ${addonProducts.type} = 'custom_domain' AND ${addonPurchases.status} = 'active')`,
        total: sql<number>`COUNT(*) FILTER (WHERE ${addonProducts.type} = 'custom_domain')`,
      })
      .from(addonPurchases)
      .innerJoin(addonProducts, eq(addonPurchases.productId, addonProducts.id));

    const [whatsappStats] = await db
      .select({
        active: sql<number>`COUNT(*) FILTER (WHERE ${addonProducts.type} = 'whatsapp_quota' AND ${addonPurchases.status} = 'active')`,
        total: sql<number>`COUNT(*) FILTER (WHERE ${addonProducts.type} = 'whatsapp_quota')`,
      })
      .from(addonPurchases)
      .innerJoin(addonProducts, eq(addonPurchases.productId, addonProducts.id));

    // Calculate revenue
    const [revenueStats] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${addonProducts.price}), 0)`,
      })
      .from(addonPurchases)
      .innerJoin(addonProducts, eq(addonPurchases.productId, addonProducts.id))
      .where(eq(addonPurchases.status, "active" as any));

    return NextResponse.json({
      addons: results.map(a => ({
        ...a,
        price: Number(a.price),
        usedQuota: Number(a.usedQuota || 0),
      })),
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
      stats: {
        customDomain: {
          active: Number(customDomainStats?.active || 0),
          total: Number(customDomainStats?.total || 0),
        },
        whatsapp: {
          active: Number(whatsappStats?.active || 0),
          total: Number(whatsappStats?.total || 0),
        },
        totalRevenue: Number(revenueStats?.total || 0),
      },
    });
  } catch (error) {
    console.error("[Founder Addons API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
