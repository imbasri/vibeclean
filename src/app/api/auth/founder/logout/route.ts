import { NextResponse } from "next/server";
import { clearFounderSession } from "@/lib/founder-auth";

export async function POST() {
  try {
    await clearFounderSession();
    
    return NextResponse.json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    console.error("[Founder Logout] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
