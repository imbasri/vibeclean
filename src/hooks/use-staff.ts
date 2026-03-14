import { useState, useEffect, useCallback } from "react";
import type { BranchPermission, UserRole } from "@/types";

// Staff member type
interface StaffMember {
  id: string;
  memberId: string;
  email: string;
  name: string;
  phone: string | null;
  image: string | null;
  emailVerified: boolean;
  permissions: BranchPermission[];
  joinedAt: Date;
  createdAt: Date;
}

interface StaffResponse {
  staff: StaffMember[];
  total: number;
}

interface AddStaffData {
  name: string;
  email: string;
  phone?: string;
  branchPermissions: {
    branchId: string;
    roles: UserRole[];
  }[];
}

interface UpdatePermissionsData {
  branchPermissions: {
    branchId: string;
    roles: UserRole[];
  }[];
}

interface UseStaffReturn {
  staff: StaffMember[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  addStaff: (data: AddStaffData) => Promise<{ success: boolean; message?: string }>;
  updatePermissions: (memberId: string, data: UpdatePermissionsData) => Promise<boolean>;
  removeStaff: (memberId: string) => Promise<boolean>;
  getStaffMember: (memberId: string) => Promise<StaffMember | null>;
}

export function useStaff(): UseStaffReturn {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/staff");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch staff");
      }

      const data: StaffResponse = await response.json();

      // Parse dates
      const staffWithDates = data.staff.map((member) => ({
        ...member,
        joinedAt: new Date(member.joinedAt),
        createdAt: new Date(member.createdAt),
      }));

      setStaff(staffWithDates);
      setTotal(data.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch staff";
      setError(message);
      console.error("Error fetching staff:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const addStaff = useCallback(
    async (data: AddStaffData): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to add staff");
        }

        // Refetch staff to get updated list
        await fetchStaff();

        return { success: true, message: result.message };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add staff";
        console.error("Error adding staff:", message);
        throw err;
      }
    },
    [fetchStaff]
  );

  const updatePermissions = useCallback(
    async (memberId: string, data: UpdatePermissionsData): Promise<boolean> => {
      try {
        const response = await fetch(`/api/staff/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update permissions");
        }

        // Refetch staff to get updated data
        await fetchStaff();

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update permissions";
        console.error("Error updating permissions:", message);
        throw err;
      }
    },
    [fetchStaff]
  );

  const removeStaff = useCallback(
    async (memberId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/staff/${memberId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to remove staff");
        }

        // Update local state
        setStaff((prev) => prev.filter((s) => s.memberId !== memberId));
        setTotal((prev) => prev - 1);

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove staff";
        console.error("Error removing staff:", message);
        throw err;
      }
    },
    []
  );

  const getStaffMember = useCallback(
    async (memberId: string): Promise<StaffMember | null> => {
      try {
        const response = await fetch(`/api/staff/${memberId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch staff member");
        }

        const result = await response.json();
        return {
          ...result.staff,
          joinedAt: new Date(result.staff.joinedAt),
          createdAt: new Date(result.staff.createdAt),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch staff member";
        console.error("Error fetching staff member:", message);
        throw err;
      }
    },
    []
  );

  return {
    staff,
    isLoading,
    error,
    total,
    refetch: fetchStaff,
    addStaff,
    updatePermissions,
    removeStaff,
    getStaffMember,
  };
}

// Export types for use in components
export type { StaffMember, AddStaffData, UpdatePermissionsData };
