import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, branches, organizations, organizationMembers, branchPermissions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";

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

// Helper to check if user has owner role in organization
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

// QR Code configuration
const QR_CODE_SIZES = {
  small: 200,
  medium: 300,
  large: 400,
} as const;

type QRCodeSize = keyof typeof QR_CODE_SIZES;

// POST /api/branches/[id]/qrcode - Generate payment QR code for a branch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id: branchId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { 
      size = "medium", 
      amount,
      label,
      includeAmount = true 
    } = body as {
      size?: QRCodeSize;
      amount?: number;
      label?: string;
      includeAmount?: boolean;
    };

    // Validate size
    if (!QR_CODE_SIZES[size]) {
      return NextResponse.json(
        { error: "Invalid size. Use: small, medium, or large" },
        { status: 400 }
      );
    }

    // Check if user is owner
    const isOwner = await isOwnerInOrganization(session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Hanya owner yang dapat membuat QR Code pembayaran" },
        { status: 403 }
      );
    }

    // Get branch
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) {
      return NextResponse.json(
        { error: "Cabang tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, branch.organizationId));

    if (!organization) {
      return NextResponse.json(
        { error: "Organization tidak ditemukan" },
        { status: 404 }
      );
    }

    // Generate payment URL for this branch
    // This URL can be used for payment collection
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentBaseUrl = `${appUrl}/pay/${organization.slug}/${branch.id}`;

    // Build QR code data
    let qrData = paymentBaseUrl;
    
    // If amount is specified and should be included, add it to the URL
    if (includeAmount && amount && amount > 0) {
      qrData = `${paymentBaseUrl}?amount=${amount}`;
    }

    // If custom label is provided
    if (label) {
      qrData = `${qrData}${qrData.includes('?') ? '&' : '?'}=encodeURIComponent(label)}`;
    }

    // Generate QR code as data URL with custom colors
    const qrCodeUrl = await generateQRCodeDataURL(qrData, QR_CODE_SIZES[size], {
      color: {
        dark: branch.qrColorDark || "#000000",
        light: branch.qrColorLight || "#FFFFFF",
      },
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeUrl,
      qrData,
      branch: {
        id: branch.id,
        name: branch.name,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      paymentUrl: paymentBaseUrl,
      config: {
        size,
        amount: amount || null,
        label: label || null,
        includeAmount,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}

// Simple QR Code generator using qrcode library
async function generateQRCodeDataURL(
  data: string, 
  size: number,
  options?: {
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const qrOptions = {
    width: size,
    margin: 2,
    color: {
      dark: options?.color?.dark || "#000000",
      light: options?.color?.light || "#FFFFFF",
    },
    errorCorrectionLevel: "M" as const,
  };
  
  const qrDataUrl = await QRCode.toDataURL(data, qrOptions);
  
  return qrDataUrl;
}

// GET /api/branches/[id]/qrcode - Get existing payment settings for a branch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id: branchId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get branch
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));

    if (!branch) {
      return NextResponse.json(
        { error: "Cabang tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, branch.organizationId));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentBaseUrl = organization 
      ? `${appUrl}/pay/${organization.slug}/${branch.id}`
      : null;

    return NextResponse.json({
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      },
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      } : null,
      paymentUrl: paymentBaseUrl,
      paymentSettings: {
        enabled: true,
        defaultAmount: null,
        allowCustomAmount: true,
      },
    });
  } catch (error) {
    console.error("Error fetching branch payment info:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch payment info" },
      { status: 500 }
    );
  }
}
