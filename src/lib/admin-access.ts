import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isSuperAdmin } from "@/lib/admin";
import { verifyFounderSession } from "@/lib/founder-auth";

// Helper to get session from better-auth
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Check if user is admin (either via email in ADMIN_EMAILS or founder session)
export async function checkAdminAccess(): Promise<boolean> {
  // Check founder session first
  const founderSession = await verifyFounderSession();
  if (founderSession) {
    return true;
  }
  
  // Check via email in ADMIN_EMAILS
  const session = await getSession();
  if (session?.user && isSuperAdmin(session.user.email)) {
    return true;
  }
  
  return false;
}

// Get current admin info (either founder or super admin email)
export async function getAdminInfo(): Promise<{ type: "founder" | "superadmin"; identifier: string } | null> {
  // Check founder session first
  const founderSession = await verifyFounderSession();
  if (founderSession) {
    return { type: "founder", identifier: founderSession.username };
  }
  
  // Check via email in ADMIN_EMAILS
  const session = await getSession();
  if (session?.user && isSuperAdmin(session.user.email)) {
    return { type: "superadmin", identifier: session.user.email };
  }
  
  return null;
}
