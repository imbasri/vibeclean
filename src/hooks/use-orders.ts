import { useState, useEffect, useCallback } from "react";
import type { Order, OrderStatus, PaymentStatus, PaymentMethod } from "@/types";
import type { CreateOrderInput } from "@/lib/validations/schemas";

interface UseOrdersOptions {
  branchId?: string;
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
  search?: string;
  page?: number;
  limit?: number;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UpdateOrderData {
  status?: OrderStatus;
  statusNotes?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAmount?: number;
  notes?: string;
}

interface CreateOrderData extends CreateOrderInput {
  branchId: string;
  customerId?: string;
}

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  refetch: () => Promise<void>;
  createOrder: (data: CreateOrderData) => Promise<Order | null>;
  updateOrder: (id: string, data: UpdateOrderData) => Promise<Order | null>;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<Order | null>;
  cancelOrder: (id: string) => Promise<boolean>;
  getOrder: (id: string) => Promise<Order | null>;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.branchId) params.set("branchId", options.branchId);
      if (options.status && options.status !== "all") params.set("status", options.status);
      if (options.paymentStatus && options.paymentStatus !== "all") params.set("paymentStatus", options.paymentStatus);
      if (options.search) params.set("search", options.search);
      if (options.page) params.set("page", String(options.page));
      if (options.limit) params.set("limit", String(options.limit));

      const response = await fetch(`/api/orders?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch orders");
      }

      const data: OrdersResponse = await response.json();
      
      // Parse dates
      const ordersWithDates = data.orders.map((order) => ({
        ...order,
        estimatedCompletionAt: new Date(order.estimatedCompletionAt),
        completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      }));
      
      setOrders(ordersWithDates);
      setPagination({
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch orders";
      setError(message);
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.branchId, options.status, options.paymentStatus, options.search, options.page, options.limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = useCallback(async (data: CreateOrderData): Promise<Order | null> => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const result = await response.json();
      const newOrder = {
        ...result.order,
        estimatedCompletionAt: new Date(result.order.estimatedCompletionAt),
        completedAt: result.order.completedAt ? new Date(result.order.completedAt) : undefined,
        createdAt: new Date(result.order.createdAt),
        updatedAt: new Date(result.order.updatedAt),
      };

      // Update local state - add to beginning of list
      setOrders((prev) => [newOrder, ...prev]);
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
        totalPages: Math.ceil((prev.total + 1) / prev.limit),
      }));

      return newOrder;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create order";
      console.error("Error creating order:", message);
      throw err;
    }
  }, []);

  const updateOrder = useCallback(async (
    id: string,
    data: UpdateOrderData
  ): Promise<Order | null> => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order");
      }

      const result = await response.json();
      const updatedOrder = {
        ...result.order,
        estimatedCompletionAt: new Date(result.order.estimatedCompletionAt),
        completedAt: result.order.completedAt ? new Date(result.order.completedAt) : undefined,
        createdAt: new Date(result.order.createdAt),
        updatedAt: new Date(result.order.updatedAt),
      };

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updatedOrder } : o))
      );

      return updatedOrder;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update order";
      console.error("Error updating order:", message);
      throw err;
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    id: string,
    status: OrderStatus,
    notes?: string
  ): Promise<Order | null> => {
    return updateOrder(id, { status, statusNotes: notes });
  }, [updateOrder]);

  const cancelOrder = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel order");
      }

      // Update local state - mark as cancelled
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelled" as OrderStatus } : o))
      );

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      console.error("Error cancelling order:", message);
      throw err;
    }
  }, []);

  const getOrder = useCallback(async (id: string): Promise<Order | null> => {
    try {
      const response = await fetch(`/api/orders/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch order");
      }

      const result = await response.json();
      return {
        ...result.order,
        estimatedCompletionAt: new Date(result.order.estimatedCompletionAt),
        completedAt: result.order.completedAt ? new Date(result.order.completedAt) : undefined,
        createdAt: new Date(result.order.createdAt),
        updatedAt: new Date(result.order.updatedAt),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch order";
      console.error("Error fetching order:", message);
      throw err;
    }
  }, []);

  return {
    orders,
    isLoading,
    error,
    pagination,
    refetch: fetchOrders,
    createOrder,
    updateOrder,
    updateOrderStatus,
    cancelOrder,
    getOrder,
  };
}
