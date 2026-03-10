"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, users, organizations, organizationMembers, branchPermissions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUploader, getProviderName } from "@/lib/upload";

async function getSession() {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
}

async function isOwner(userId: string): Promise<boolean> {
  const permissions = await db
    .select({ role: branchPermissions.role })
    .from(organizationMembers)
    .innerJoin(branchPermissions, eq(branchPermissions.memberId, organizationMembers.id))
    .where(eq(organizationMembers.userId, userId));

  return permissions.some((p) => p.role === "owner");
}

async function getUserOrganization(userId: string) {
  const membership = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  return membership[0]?.organizationId || null;
}

export async function uploadProfileImage(formData: FormData): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("image") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const uploader = getUploader();
    console.log(`Using upload provider: ${uploader.name}`);
    
    const result = await uploader.upload(file, { folder: "profiles" });

    if (!result.success || !result.url) {
      return { success: false, error: result.error || "Upload failed" };
    }

    await db
      .update(users)
      .set({ image: result.url, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    return { success: true, imageUrl: result.url };
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return { success: false, error: "Failed to upload image" };
  }
}

export async function uploadOrganizationLogo(formData: FormData): Promise<{
  success: boolean;
  logoUrl?: string;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userIsOwner = await isOwner(session.user.id);
    if (!userIsOwner) {
      return { success: false, error: "Only owners can upload organization logo" };
    }

    const organizationId = await getUserOrganization(session.user.id);
    if (!organizationId) {
      return { success: false, error: "Organization not found" };
    }

    const file = formData.get("logo") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const uploader = getUploader();
    console.log(`Using upload provider: ${uploader.name}`);
    
    const result = await uploader.upload(file, { folder: "logos" });

    if (!result.success || !result.url) {
      return { success: false, error: result.error || "Upload failed" };
    }

    await db
      .update(organizations)
      .set({ logo: result.url, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    return { success: true, logoUrl: result.url };
  } catch (error) {
    console.error("Error uploading organization logo:", error);
    return { success: false, error: "Failed to upload logo" };
  }
}
