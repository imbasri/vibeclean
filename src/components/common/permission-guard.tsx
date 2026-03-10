"use client";

import React from "react";
import { useAuth, type FeatureKey } from "@/contexts/auth-context";
import type { UserRole } from "@/types";

// ============================================
// PERMISSION GUARD COMPONENT
// ============================================

interface PermissionGuardProps {
  children: React.ReactNode;
  
  // Permission checks (at least one required)
  roles?: UserRole[];          // User must have at least one of these roles
  allowedRoles?: UserRole[];   // Alias for roles (for convenience)
  allRoles?: UserRole[];       // User must have ALL of these roles
  feature?: FeatureKey;        // User must have access to this feature
  
  // Behavior options
  requireAll?: boolean;        // If true with roles, user must have ALL roles
  fallback?: React.ReactNode;  // What to show if permission denied
  hideOnly?: boolean;          // If true, just hides content instead of showing fallback
}

export function PermissionGuard({
  children,
  roles,
  allowedRoles,
  allRoles,
  feature,
  requireAll = false,
  fallback = null,
  hideOnly = false,
}: PermissionGuardProps) {
  const { hasRole, hasAnyRole, hasAllRoles, canAccessFeature, isAuthenticated } = useAuth();

  // Merge roles and allowedRoles (allowedRoles is an alias for roles)
  const effectiveRoles = roles || allowedRoles;

  // Not authenticated = no access
  if (!isAuthenticated) {
    return hideOnly ? null : <>{fallback}</>;
  }

  let hasPermission = true;

  // Check feature permission
  if (feature) {
    hasPermission = hasPermission && canAccessFeature(feature);
  }

  // Check roles (any)
  if (effectiveRoles && effectiveRoles.length > 0) {
    if (requireAll) {
      hasPermission = hasPermission && hasAllRoles(effectiveRoles);
    } else {
      hasPermission = hasPermission && hasAnyRole(effectiveRoles);
    }
  }

  // Check allRoles (must have all)
  if (allRoles && allRoles.length > 0) {
    hasPermission = hasPermission && hasAllRoles(allRoles);
  }

  if (!hasPermission) {
    return hideOnly ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// ROLE BADGE COMPONENT
// ============================================

interface RoleBadgeProps {
  role: UserRole;
  size?: "sm" | "md" | "lg";
}

const ROLE_STYLES: Record<UserRole, { bg: string; text: string; label: string }> = {
  owner: {
    bg: "bg-purple-100 dark:bg-purple-900",
    text: "text-purple-700 dark:text-purple-300",
    label: "Owner",
  },
  manager: {
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-700 dark:text-blue-300",
    label: "Manager",
  },
  cashier: {
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-700 dark:text-green-300",
    label: "Kasir",
  },
  courier: {
    bg: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-700 dark:text-orange-300",
    label: "Kurir",
  },
};

const SIZE_STYLES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function RoleBadge({ role, size = "md" }: RoleBadgeProps) {
  const style = ROLE_STYLES[role];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${style.bg} ${style.text} ${sizeStyle}`}
    >
      {style.label}
    </span>
  );
}

// ============================================
// OWNER ONLY COMPONENT
// ============================================

interface OwnerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OwnerOnly({ children, fallback }: OwnerOnlyProps) {
  return (
    <PermissionGuard roles={["owner"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

// ============================================
// MANAGER+ COMPONENT (Manager or Owner)
// ============================================

interface ManagerPlusProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ManagerPlus({ children, fallback }: ManagerPlusProps) {
  return (
    <PermissionGuard roles={["owner", "manager"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

// ============================================
// CASHIER ACCESS COMPONENT
// ============================================

interface CashierAccessProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CashierAccess({ children, fallback }: CashierAccessProps) {
  return (
    <PermissionGuard roles={["owner", "manager", "cashier"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
