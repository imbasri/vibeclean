import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = process.env.FOUNDER_SECRET_KEY || "vibeclean_founder_secret_key";
const COOKIE_NAME = "founder_session";

const JWT_SECRET = new TextEncoder().encode(SECRET_KEY);

export interface FounderSession {
  username: string;
  loginAt: string;
  expiresAt: string;
}

export async function createFounderSession(username: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const token = await new SignJWT({ username, loginAt: new Date().toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function verifyFounderSession(): Promise<FounderSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if expired
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return null;
    }

    return {
      username: payload.username as string,
      loginAt: payload.loginAt as string,
      expiresAt: new Date(payload.exp! * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearFounderSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function getFounderCredentials(): { username: string; password: string } | null {
  const username = process.env.FOUNDER_USERNAME;
  const password = process.env.FOUNDER_PASSWORD;

  if (!username || !password) {
    console.error("Founder credentials not configured in ENV");
    return null;
  }

  return { username, password };
}

export function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  // Simple string comparison (in production, use bcrypt)
  return inputPassword === storedPassword;
}

export function hashPassword(password: string): string {
  // Simple hash for demo - in production use bcrypt
  // For now, we'll use simple comparison
  return password;
}
