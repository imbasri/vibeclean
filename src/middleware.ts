import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for UploadThing API routes
  if (pathname.startsWith("/api/uploadthing")) {
    return NextResponse.next();
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

    // Verify founder session by checking cookie
    // We check the cookie existence here, actual validation happens in the route
    const founderCookie = request.cookies.get("founder_session");
    if (!founderCookie) {
      const loginUrl = new URL("/founder/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check for session cookie for regular users (Better Auth sets this by default)
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionCookie;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
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
