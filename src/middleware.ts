import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFounderSession } from "@/lib/founder-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect /admin to /founder/dashboard
  if (pathname.startsWith("/admin")) {
    const dashboardUrl = new URL("/founder/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Check if accessing founder routes (require authentication)
  if (pathname.startsWith("/founder")) {
    // Skip if already on login page
    if (pathname === "/founder/login") {
      return NextResponse.next();
    }

    // Redirect root /founder to dashboard
    if (pathname === "/founder") {
      const dashboardUrl = new URL("/founder/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Verify founder session for other routes
    const session = await verifyFounderSession();
    
    if (!session) {
      const loginUrl = new URL("/founder/login", request.url);
      return NextResponse.redirect(loginUrl);
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
