import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// POST /api/settings/password - Change user password
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword: string;
      newPassword: string;
    };

    // Validate input
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Password saat ini diperlukan" },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: "Password baru diperlukan" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    // Verify current password first for security
    try {
      await auth.api.signInEmail({
        body: {
          email: session.user.email,
          password: currentPassword,
        },
      });
    } catch (signInError) {
      return NextResponse.json(
        { error: "Password saat ini salah" },
        { status: 401 }
      );
    }

    // Change the password using Better Auth API
    await auth.api.changePassword({
      body: {
        newPassword,
        currentPassword,
      },
      headers: await headers(),
    });

    return NextResponse.json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Gagal mengubah password" },
      { status: 500 }
    );
  }
}
