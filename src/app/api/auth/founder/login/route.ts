import { NextRequest, NextResponse } from "next/server";
import { createFounderSession, getFounderCredentials, verifyPassword } from "@/lib/founder-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Get credentials from ENV
    const credentials = getFounderCredentials();
    
    if (!credentials) {
      console.error("[Founder Login] Credentials not configured");
      return NextResponse.json(
        { error: "Konfigurasi login bermasalah" },
        { status: 500 }
      );
    }

    // Verify credentials
    if (username !== credentials.username || !verifyPassword(password, credentials.password)) {
      // Log failed attempt (don't expose which one failed)
      console.log(`[Founder Login] Failed attempt for username: ${username}`);
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    // Create session
    await createFounderSession(username);

    console.log(`[Founder Login] Success for username: ${username}`);

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
    });
  } catch (error) {
    console.error("[Founder Login] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
