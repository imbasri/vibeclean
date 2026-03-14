import { useState, useEffect, useCallback } from "react";
import type { Customer } from "@/types";
import type { CreateCustomerInput } from "@/lib/validations/schemas";

interface UseCustomersOptions {
  search?: string;
  sortBy?: "name" | "totalSpent" | "totalOrders" | "memberSince";
  sortOrder?: "asc" | "desc";
}

interface UseCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCustomer: (data: CreateCustomerInput) => Promise<Customer | null>;
  updateCustomer: (id: string, data: CreateCustomerInput) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.search) params.set("search", options.search);
      if (options.sortBy) params.set("sortBy", options.sortBy);
      if (options.sortOrder) params.set("sortOrder", options.sortOrder);

      const response = await fetch(`/api/customers?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch customers";
      setError(message);
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.search, options.sortBy, options.sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const createCustomer = useCallback(async (
    data: CreateCustomerInput
  ): Promise<Customer | null> => {
    try {
      const response = await fetch("/api/customers", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      const result = await response.json();
      const newCustomer = result.customer;
      
      // Update local state - add to beginning of list
      setCustomers((prev) => [newCustomer, ...prev]);
      
      return newCustomer;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create customer";
      console.error("Error creating customer:", message);
      throw err;
    }
  }, []);

  const updateCustomer = useCallback(async (
    id: string,
    data: CreateCustomerInput
  ): Promise<Customer | null> => {
    try {
      const response = await fetch(`/api/customers/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update customer");
      }

      const result = await response.json();
      const updatedCustomer = result.customer;
      
      // Update local state
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? updatedCustomer : c))
      );
      
      return updatedCustomer;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update customer";
      console.error("Error updating customer:", message);
      throw err;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/customers/${id}`, { credentials: "include", 
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete customer");
      }

      // Update local state
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete customer";
      console.error("Error deleting customer:", message);
      throw err;
    }
  }, []);

  return {
    customers,
    isLoading,
    error,
    refetch: fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
