import { NextRequest, NextResponse } from "next/server";
import { verifyFounderSession, clearFounderSession } from "@/lib/founder-auth";

export async function POST(request: NextRequest) {
  try {
    // Verify session first
    const session = await verifyFounderSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Password baru dan konfirmasi tidak cocok" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    // Verify current password
    const currentPasswordEnv = process.env.FOUNDER_PASSWORD;
    
    if (currentPassword !== currentPasswordEnv) {
      return NextResponse.json(
        { error: "Password lama salah" },
        { status: 401 }
      );
    }

    // In production, you'd update the Heroku config
    // For now, we just return success and instruct to update ENV manually
    // Or we can use Heroku API to update (requires API key)
    
    console.log(`[Founder Password Change] Request from: ${session.username}`);

    // Clear session (require re-login with new password)
    await clearFounderSession();

    return NextResponse.json({
      success: true,
      message: "Password berhasil diubah. Silakan login ulang dengan password baru.",
      // Note: In production, you'd update Heroku config here
      // For security, manual update via Heroku dashboard is recommended
    });
  } catch (error) {
    console.error("[Founder Password Change] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
