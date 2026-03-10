import { useState, useEffect, useCallback } from "react";
import type { LaundryService, ServiceCategory } from "@/types";
import type { CreateServiceInput } from "@/lib/validations/schemas";

interface UseServicesOptions {
  branchId?: string;
  category?: ServiceCategory | "all";
  isActive?: "all" | "active" | "inactive";
}

interface UseServicesReturn {
  services: LaundryService[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createService: (data: CreateServiceInput & { branchId: string; isActive?: boolean }) => Promise<LaundryService | null>;
  updateService: (id: string, data: CreateServiceInput & { isActive?: boolean }) => Promise<LaundryService | null>;
  deleteService: (id: string) => Promise<boolean>;
  toggleServiceStatus: (id: string, isActive: boolean) => Promise<LaundryService | null>;
}

export function useServices(options: UseServicesOptions = {}): UseServicesReturn {
  const [services, setServices] = useState<LaundryService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.branchId) params.set("branchId", options.branchId);
      if (options.category && options.category !== "all") params.set("category", options.category);
      if (options.isActive && options.isActive !== "all") {
        params.set("isActive", options.isActive === "active" ? "true" : "false");
      }

      const response = await fetch(`/api/services?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch services");
      }

      const data = await response.json();
      setServices(data.services || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch services";
      setError(message);
      console.error("Error fetching services:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.branchId, options.category, options.isActive]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const createService = useCallback(async (
    data: CreateServiceInput & { branchId: string; isActive?: boolean }
  ): Promise<LaundryService | null> => {
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create service");
      }

      const result = await response.json();
      const newService = result.service;
      
      // Update local state
      setServices((prev) => [...prev, newService]);
      
      return newService;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create service";
      console.error("Error creating service:", message);
      throw err;
    }
  }, []);

  const updateService = useCallback(async (
    id: string,
    data: CreateServiceInput & { isActive?: boolean }
  ): Promise<LaundryService | null> => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update service");
      }

      const result = await response.json();
      const updatedService = result.service;
      
      // Update local state
      setServices((prev) =>
        prev.map((s) => (s.id === id ? updatedService : s))
      );
      
      return updatedService;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update service";
      console.error("Error updating service:", message);
      throw err;
    }
  }, []);

  const deleteService = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete service");
      }

      // Update local state
      setServices((prev) => prev.filter((s) => s.id !== id));
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete service";
      console.error("Error deleting service:", message);
      throw err;
    }
  }, []);

  const toggleServiceStatus = useCallback(async (
    id: string,
    isActive: boolean
  ): Promise<LaundryService | null> => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update service status");
      }

      const result = await response.json();
      const updatedService = result.service;
      
      // Update local state
      setServices((prev) =>
        prev.map((s) => (s.id === id ? updatedService : s))
      );
      
      return updatedService;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update service status";
      console.error("Error toggling service status:", message);
      throw err;
    }
  }, []);

  return {
    services,
    isLoading,
    error,
    refetch: fetchServices,
    createService,
    updateService,
    deleteService,
    toggleServiceStatus,
  };
}
