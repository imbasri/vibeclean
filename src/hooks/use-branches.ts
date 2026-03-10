import { useState, useEffect, useCallback } from "react";
import type { Branch } from "@/types";

// Branch stats type
interface BranchStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  staffCount: number;
}

// Extended branch with stats
interface BranchWithStats extends Branch {
  stats?: BranchStats;
}

interface UseBranchesOptions {
  includeStats?: boolean;
}

interface BranchesResponse {
  branches: BranchWithStats[];
  total: number;
}

interface CreateBranchData {
  name: string;
  address: string;
  phone: string;
  isActive?: boolean;
}

interface UpdateBranchData {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

interface UseBranchesReturn {
  branches: BranchWithStats[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  createBranch: (data: CreateBranchData) => Promise<Branch | null>;
  updateBranch: (id: string, data: UpdateBranchData) => Promise<Branch | null>;
  deleteBranch: (id: string) => Promise<boolean>;
  getBranch: (id: string) => Promise<Branch | null>;
}

export function useBranches(
  options: UseBranchesOptions = {}
): UseBranchesReturn {
  const [branches, setBranches] = useState<BranchWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.includeStats) params.set("includeStats", "true");

      const response = await fetch(`/api/branches?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch branches");
      }

      const data: BranchesResponse = await response.json();

      // Parse dates
      const branchesWithDates = data.branches.map((branch) => ({
        ...branch,
        createdAt: new Date(branch.createdAt),
        updatedAt: new Date(branch.updatedAt),
      }));

      setBranches(branchesWithDates);
      setTotal(data.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch branches";
      setError(message);
      console.error("Error fetching branches:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.includeStats]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const createBranch = useCallback(
    async (data: CreateBranchData): Promise<Branch | null> => {
      try {
        const response = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create branch");
        }

        const result = await response.json();
        const newBranch = {
          ...result.branch,
          createdAt: new Date(result.branch.createdAt),
          updatedAt: new Date(result.branch.updatedAt),
        };

        // Update local state - add to beginning of list
        setBranches((prev) => [newBranch, ...prev]);
        setTotal((prev) => prev + 1);

        return newBranch;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create branch";
        console.error("Error creating branch:", message);
        throw err;
      }
    },
    []
  );

  const updateBranch = useCallback(
    async (id: string, data: UpdateBranchData): Promise<Branch | null> => {
      try {
        const response = await fetch(`/api/branches/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update branch");
        }

        const result = await response.json();
        const updatedBranch = {
          ...result.branch,
          createdAt: new Date(result.branch.createdAt),
          updatedAt: new Date(result.branch.updatedAt),
        };

        // Update local state
        setBranches((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, ...updatedBranch } : b
          )
        );

        return updatedBranch;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update branch";
        console.error("Error updating branch:", message);
        throw err;
      }
    },
    []
  );

  const deleteBranch = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/branches/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete branch");
      }

      // Update local state - mark as inactive
      setBranches((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: false } : b))
      );

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete branch";
      console.error("Error deleting branch:", message);
      throw err;
    }
  }, []);

  const getBranch = useCallback(async (id: string): Promise<Branch | null> => {
    try {
      const response = await fetch(`/api/branches/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch branch");
      }

      const result = await response.json();
      return {
        ...result.branch,
        createdAt: new Date(result.branch.createdAt),
        updatedAt: new Date(result.branch.updatedAt),
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch branch";
      console.error("Error fetching branch:", message);
      throw err;
    }
  }, []);

  return {
    branches,
    isLoading,
    error,
    total,
    refetch: fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranch,
  };
}
