import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFounderSession } from "@/lib/founder-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing founder routes
  if (pathname.startsWith("/founder") || pathname.startsWith("/admin")) {
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

    // Check if accessing /admin - redirect to /founder/settings for now
    if (pathname === "/admin") {
      const settingsUrl = new URL("/founder/settings", request.url);
      return NextResponse.redirect(settingsUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/founder/:path*",
    "/admin/:path*",
  ],
};
