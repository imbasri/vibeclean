"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { AuthUser, Branch, UserRole, BranchPermission } from "@/types";
import { useSession, signOut as betterAuthSignOut } from "@/lib/auth-client";
// Note: Dummy data removed - now fetching from API

// ============================================
// CONTEXT TYPES
// ============================================

interface AuthContextType {
  // User State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;

  // Branch State
  activeBranch: Branch | null;
  activeRoles: UserRole[];
  availableBranches: Branch[];

  // Actions
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => void;
  refreshUser: () => Promise<void>;
  
  // Permission Helpers
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  canAccessFeature: (feature: FeatureKey) => boolean;
}

// ============================================
// FEATURE PERMISSIONS MAP
// ============================================

export type FeatureKey =
  | "dashboard"
  | "pos"
  | "orders"
  | "staff"
  | "settings"
  | "reports"
  | "billing"
  | "branches"
  | "services"
  | "customers"
  | "discounts"
  | "delivery";

const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
  dashboard: ["owner", "manager", "cashier", "courier"],
  pos: ["owner", "manager", "cashier"],
  orders: ["owner", "manager", "cashier", "courier"],
  staff: ["owner", "manager"],
  settings: ["owner", "manager"],
  reports: ["owner", "manager"],
  billing: ["owner"],
  branches: ["owner"],
  services: ["owner", "manager"],
  customers: ["owner", "manager", "cashier"],
  discounts: ["owner", "manager"],
  delivery: ["owner", "manager", "courier"],
};

// ============================================
// CONTEXT CREATION
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Better Auth session
  const { data: session, isPending: sessionLoading } = useSession();
  
  // Local state for app-specific user data (roles, permissions, etc.)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userBranches, setUserBranches] = useState<Branch[]>([]);

  // Combined loading state
  const isLoading = sessionLoading || isLoadingPermissions;

  // Derived state
  const isAuthenticated = session?.user !== undefined && authUser !== null;

  const availableBranches = useMemo(() => {
    return userBranches;
  }, [userBranches]);

  const activeBranch = useMemo(() => {
    if (!authUser?.activeBranchId) return null;
    return userBranches.find((b) => b.id === authUser.activeBranchId) || null;
  }, [authUser, userBranches]);

  const activeRoles = useMemo(() => {
    return authUser?.activeRoles || [];
  }, [authUser]);

  // ============================================
  // FETCH USER PERMISSIONS FROM API
  // ============================================

  const fetchUserPermissions = useCallback(async () => {
    setIsLoadingPermissions(true);
    
    try {
      // Fetch permissions from API
      const response = await fetch("/api/user/permissions");
      
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await response.json();
      
      // Check if user needs onboarding
      if (data.needsOnboarding) {
        setNeedsOnboarding(true);
        setAuthUser(null);
        setUserBranches([]);
        return;
      }

      setNeedsOnboarding(false);

      // Map API response to Branch type
      const branches: Branch[] = data.branches.map((b: {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
      }) => ({
        id: b.id,
        organizationId: data.organization.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        isActive: b.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setUserBranches(branches);

      // Map permissions to BranchPermission type
      const permissions: BranchPermission[] = data.permissions.map((p: {
        branchId: string;
        branchName: string;
        roles: string[];
      }) => ({
        branchId: p.branchId,
        branchName: p.branchName,
        roles: p.roles as UserRole[],
      }));

      // Get first branch as default active
      const defaultBranch = permissions[0] || null;

      const userPermissions: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone || undefined,
        image: data.user.image || undefined,
        emailVerified: data.user.emailVerified,
        createdAt: new Date(data.user.createdAt),
        updatedAt: new Date(data.user.updatedAt),
        organizationId: data.organization?.id || "",
        organizationName: data.organization?.name || "",
        permissions,
        activeBranchId: defaultBranch?.branchId || null,
        activeRoles: defaultBranch?.roles || [],
      };
      
      setAuthUser(userPermissions);
    } catch (error) {
      console.error("Failed to fetch user permissions:", error);
      setAuthUser(null);
      setUserBranches([]);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, []);

  // Effect to sync Better Auth session with app state
  useEffect(() => {
    if (session?.user) {
      // User is authenticated via Better Auth, fetch their permissions
      fetchUserPermissions();
    } else if (!sessionLoading) {
      // User is not authenticated
      setAuthUser(null);
      setUserBranches([]);
      setNeedsOnboarding(false);
    }
  }, [session, sessionLoading, fetchUserPermissions]);

  // Effect to auto-initialize onboarding for new users
  useEffect(() => {
    if (needsOnboarding && session?.user && !isLoadingPermissions) {
      // Auto-create organization for new users
      const initializeOnboarding = async () => {
        try {
          console.log("Initializing onboarding for new user...");
          const response = await fetch("/api/onboarding/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            console.log("Onboarding completed, refreshing permissions...");
            // Refresh permissions after onboarding
            await fetchUserPermissions();
          } else {
            const data = await response.json();
            // If already onboarded, just refresh
            if (data.code === "ALREADY_ONBOARDED") {
              await fetchUserPermissions();
            } else {
              console.error("Onboarding failed:", data.error);
            }
          }
        } catch (error) {
          console.error("Failed to initialize onboarding:", error);
        }
      };

      initializeOnboarding();
    }
  }, [needsOnboarding, session, isLoadingPermissions, fetchUserPermissions]);

  // ============================================
  // ACTIONS
  // ============================================

  const logout = useCallback(async () => {
    await betterAuthSignOut();
    setAuthUser(null);
    setUserBranches([]);
    setNeedsOnboarding(false);
  }, []);

  const switchBranch = useCallback((branchId: string) => {
    if (!authUser) return;

    const permission = authUser.permissions.find((p) => p.branchId === branchId);
    if (!permission) return;

    setAuthUser({
      ...authUser,
      activeBranchId: branchId,
      activeRoles: permission.roles,
    });
  }, [authUser]);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      await fetchUserPermissions();
    }
  }, [session, fetchUserPermissions]);

  // ============================================
  // PERMISSION HELPERS
  // ============================================

  const hasRole = useCallback((role: UserRole): boolean => {
    return activeRoles.includes(role);
  }, [activeRoles]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return roles.some((role) => activeRoles.includes(role));
  }, [activeRoles]);

  const hasAllRoles = useCallback((roles: UserRole[]): boolean => {
    return roles.every((role) => activeRoles.includes(role));
  }, [activeRoles]);

  const canAccessFeature = useCallback((feature: FeatureKey): boolean => {
    const allowedRoles = FEATURE_PERMISSIONS[feature];
    return hasAnyRole(allowedRoles);
  }, [hasAnyRole]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<AuthContextType>(
    () => ({
      user: authUser,
      isAuthenticated,
      isLoading,
      activeBranch,
      activeRoles,
      availableBranches,
      needsOnboarding,
      logout,
      switchBranch,
      refreshUser,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      canAccessFeature,
    }),
    [
      authUser,
      isAuthenticated,
      isLoading,
      activeBranch,
      activeRoles,
      availableBranches,
      needsOnboarding,
      logout,
      switchBranch,
      refreshUser,
      hasRole,
      hasAnyRole,
      hasAllRoles,
      canAccessFeature,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { FEATURE_PERMISSIONS };
