import { useState, useEffect, useCallback } from "react";
import { uploadProfileImage, uploadOrganizationLogo } from "@/app/actions/upload";

// Types
export interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
}

export interface OrganizationUpdateData {
  name?: string;
  slug?: string;
  logo?: string;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
  isUpdating: boolean;
  uploadImage: (file: File) => Promise<{ success: boolean; imageUrl?: string; error?: string }>;
}

interface UseOrganizationReturn {
  organization: OrganizationData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateOrganization: (data: OrganizationUpdateData) => Promise<{ success: boolean; error?: string }>;
  isUpdating: boolean;
  uploadLogo: (file: File) => Promise<{ success: boolean; logoUrl?: string; error?: string }>;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

interface UsePasswordReturn {
  changePassword: (data: PasswordChangeData) => Promise<{ success: boolean; error?: string }>;
  isChanging: boolean;
}

// Hook for user profile settings
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/settings/profile");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch profile";
      setError(message);
      console.error("Error fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsUpdating(true);

        const response = await fetch("/api/settings/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update profile");
        }

        // Update local state with new profile data
        if (result.profile) {
          setProfile((prev) => (prev ? { ...prev, ...result.profile } : result.profile));
        }

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update profile";
        console.error("Error updating profile:", err);
        return { success: false, error: message };
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
    isUpdating,
    uploadImage: async (file: File): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
      const formData = new FormData();
      formData.append("image", file);
      const result = await uploadProfileImage(formData);
      if (result.success && result.imageUrl) {
        setProfile((prev) => (prev ? { ...prev, image: result.imageUrl! } : prev));
      }
      return result;
    },
  };
}

// Hook for organization settings (owner only)
export function useOrganization(): UseOrganizationReturn {
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/settings/organization");

      if (!response.ok) {
        const errorData = await response.json();
        // 403 is expected for non-owners, don't treat as error
        if (response.status === 403) {
          setOrganization(null);
          return;
        }
        throw new Error(errorData.error || "Failed to fetch organization");
      }

      const data = await response.json();
      setOrganization(data.organization);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch organization";
      setError(message);
      console.error("Error fetching organization:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOrganization = useCallback(
    async (data: OrganizationUpdateData): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsUpdating(true);

        const response = await fetch("/api/settings/organization", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update organization");
        }

        // Update local state with new organization data
        if (result.organization) {
          setOrganization((prev) =>
            prev ? { ...prev, ...result.organization } : result.organization
          );
        }

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update organization";
        console.error("Error updating organization:", err);
        return { success: false, error: message };
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    isLoading,
    error,
    refetch: fetchOrganization,
    updateOrganization,
    isUpdating,
    uploadLogo: async (file: File): Promise<{ success: boolean; logoUrl?: string; error?: string }> => {
      const formData = new FormData();
      formData.append("logo", file);
      const result = await uploadOrganizationLogo(formData);
      if (result.success && result.logoUrl) {
        setOrganization((prev) => (prev ? { ...prev, logo: result.logoUrl! } : prev));
      }
      return result;
    },
  };
}

// Hook for password change
export function usePassword(): UsePasswordReturn {
  const [isChanging, setIsChanging] = useState(false);

  const changePassword = useCallback(
    async (data: PasswordChangeData): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsChanging(true);

        const response = await fetch("/api/settings/password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to change password");
        }

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to change password";
        console.error("Error changing password:", err);
        return { success: false, error: message };
      } finally {
        setIsChanging(false);
      }
    },
    []
  );

  return {
    changePassword,
    isChanging,
  };
}
