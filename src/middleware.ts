import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFounderSession } from "@/lib/founder-auth";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session for regular users
  let session;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.error("[Middleware] Session error:", error);
  }

  const isAuthenticated = !!session;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

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
    const founderSession = await verifyFounderSession();

    if (!founderSession) {
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
    "/login",
    "/register",
  ],
};
