import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFounderSession } from "@/lib/founder-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing founder routes (require authentication)
  if (pathname.startsWith("/founder")) {
    // Skip if already on login page
    if (pathname === "/founder/login") {
      return NextResponse.next();
    }

    // Verify founder session
    const session = await verifyFounderSession();
    
    if (!session) {
      // Redirect to founder login if no session
      const loginUrl = new URL("/founder/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect /founder to /founder/settings
    if (pathname === "/founder") {
      const settingsUrl = new URL("/founder/settings", request.url);
      return NextResponse.redirect(settingsUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/founder/:path*",
  ],
};
