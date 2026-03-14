"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  User,
  Phone,
  ShoppingCart,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  Loader2,
  Check,
  Percent,
  Printer,
  CheckCircle,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { PermissionGuard } from "@/components/common/permission-guard";
import { openReceiptWindow, ReceiptPrint } from "@/components/pos/receipt-print";
import { PaymentQRISDialog } from "@/components/pos/payment-qris-dialog";
import { CustomerSearchDialog } from "@/components/pos/customer-search-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

import { formatCurrency } from "@/lib/utils";
import { useServices } from "@/hooks/use-services";
import { useOrders } from "@/hooks/use-orders";
import { gooeyToast } from "goey-toast";
import { Badge } from "@/components/ui/badge";
import type { LaundryService, PaymentMethod, ServiceCategory } from "@/types";

// Category display config
const categoryConfig: Record<ServiceCategory, { label: string; color: string }> = {
  cuci: { label: "Cuci", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  setrika: { label: "Setrika", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
  cuci_setrika: { label: "Cuci + Setrika", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
  dry_clean: { label: "Dry Clean", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
  express: { label: "Express", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  khusus: { label: "Khusus", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
};

// Helper function for toast notifications
const showToast = (
  type: "success" | "error" | "warning",
  message: string,
  options?: { description?: string }
) => {
  if (type === "error") {
    gooeyToast.error(message, { description: options?.description });
  } else if (type === "warning") {
    gooeyToast.warning(message, { description: options?.description });
  } else {
    gooeyToast.success(message, { description: options?.description });
  }
};

// ============================================
// TYPES & SCHEMAS
// ============================================

// POS Customer form schema (subset for real-time validation)
const posCustomerSchema = z.object({
  customerName: z
    .string()
    .min(1, "Nama pelanggan wajib diisi")
    .min(2, "Nama minimal 2 karakter"),
  customerPhone: z
    .string()
    .min(1, "Nomor HP wajib diisi")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor HP tidak valid"),
});

type POSCustomerInput = z.infer<typeof posCustomerSchema>;

interface CartItem {
  service: LaundryService;
  quantity: number;
  notes?: string;
}

// ============================================
// SERVICE CARD COMPONENT
// ============================================

interface ServiceCardProps {
  service: LaundryService;
  onAdd: (service: LaundryService) => void;
}

function ServiceCard({ service, onAdd }: ServiceCardProps) {
  return (
    <button
      onClick={() => onAdd(service)}
      className="flex flex-col p-4 text-left bg-white dark:bg-gray-800 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-gray-900 dark:text-white flex-1">
          {service.name}
        </span>
        <Badge className={`${categoryConfig[service.category].color} text-[10px] px-1.5 py-0 h-5`}>
          {categoryConfig[service.category].label}
        </Badge>
      </div>
      <span className="text-sm text-gray-500">
        {formatCurrency(service.price)} / {service.unit}
      </span>
      <span className="text-xs text-gray-400 mt-1">
        Est. {service.estimatedDays} hari
      </span>
    </button>
  );
}

// ============================================
// CART ITEM COMPONENT
// ============================================

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (serviceId: string, quantity: number) => void;
  onRemove: (serviceId: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const subtotal = item.service.price * item.quantity;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.service.name}</p>
        <p className="text-xs text-gray-500">
          {formatCurrency(item.service.price)} / {item.service.unit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.service.id, item.quantity - 0.5)}
          disabled={item.quantity <= 0.5}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) =>
            onUpdateQuantity(item.service.id, parseFloat(e.target.value) || 0)
          }
          className="w-16 h-7 text-center text-sm"
          step="0.5"
          min="0.5"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.service.id, item.quantity + 0.5)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="font-medium text-sm">{formatCurrency(subtotal)}</p>
        <button
          onClick={() => onRemove(item.service.id)}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

// ============================================
// PAYMENT METHOD SELECTOR
// ============================================

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "qris", label: "QRIS", icon: QrCode },
  { value: "transfer", label: "Transfer", icon: CreditCard },
  { value: "ewallet", label: "E-Wallet", icon: Wallet },
];

function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon;
        const isSelected = selected === method.value;

        return (
          <button
            key={method.value}
            onClick={() => onSelect(method.value)}
            className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
            }`}
          >
            <Icon className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
            <span className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}>
              {method.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN POS PAGE
// ============================================

export default function POSPage() {
  const { isAuthenticated, activeBranch, hasRole } = useAuth();

  // Fetch services from API using hook
  const { 
    services, 
    isLoading: servicesLoading, 
    error: servicesError 
  } = useServices({ 
    branchId: activeBranch?.id,
    isActive: "active" 
  });

  // Orders hook for creating orders
  const { createOrder } = useOrders({ branchId: activeBranch?.id });

  // React Hook Form for customer info
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    trigger,
  } = useForm<POSCustomerInput>({
    resolver: zodResolver(posCustomerSchema),
    mode: "onChange", // Validate on change for real-time feedback
    defaultValues: {
      customerName: "",
      customerPhone: "",
    },
  });

  // Watch form values for display in checkout dialog
  const customerName = watch("customerName");
  const customerPhone = watch("customerPhone");

  // Zustand store
  const cartStore = useCartStore();
  const {
    items: cart,
    addItem: addToCart,
    removeItem: removeFromCart,
    updateQuantity,
    setDiscount,
    applyCoupon,
    clearCart: clearCartStore,
    getSubtotal,
    getDiscountAmount,
    getTotal,
  } = cartStore;

  // Local state (non-cart)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "all">("all");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number;
    discount: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    items: Array<{
      serviceName: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
      subtotal: number;
    }>;
    subtotal: number;
    discount: number;
    discountType?: "percentage" | "fixed";
    total: number;
    paymentMethod: string;
    estimatedCompletionAt: Date;
  } | null>(null);
  
  // QRIS Payment Dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<{
    id: string;
    orderNumber: string;
    total: number;
    customerName: string;
  } | null>(null);
  
  // Receipt Print Dialog state
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  const [foundCustomer, setFoundCustomer] = useState<{
    id: string;
    name: string;
    totalOrders: number;
    totalSpent: string;
  } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Inline customer search
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Customer search dialog
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Member package state
  const [memberStatus, setMemberStatus] = useState<{
    eligible: boolean;
    subscriptionId?: string;
    packageName?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    remainingTransactions?: number | null;
    maxWeightKg?: number | null;
    message?: string;
  } | null>(null);
  const [isCheckingMember, setIsCheckingMember] = useState(false);

  // Save as regular customer
  const [saveAsCustomer, setSaveAsCustomer] = useState(true);

  // Customer auto-lookup by phone
  useEffect(() => {
    const phone = customerPhone;
    if (!phone || phone.length < 4) {
      setFoundCustomer(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const response = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`);
        const data = await response.json();
        
        if (data.customer) {
          setFoundCustomer(data.customer);
          // Auto-fill customer name if found
          reset((prev) => ({
            ...prev,
            customerName: data.customer.name,
          }));
        } else {
          setFoundCustomer(null);
        }
      } catch (error) {
        console.error("Customer lookup error:", error);
      } finally {
        setIsLookingUp(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [customerPhone, reset]);

  // Check member package status when customer is found
  const checkMemberStatus = useCallback(async (customerId: string, weight: number = 0) => {
    if (!customerId || !activeBranch?.id) return;
    
    setIsCheckingMember(true);
    try {
      const response = await fetch("/api/member-packages/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          branchId: activeBranch.id,
          weight,
        }),
      });
      const data = await response.json();
      setMemberStatus(data);
    } catch (error) {
      console.error("Member check error:", error);
      setMemberStatus(null);
    } finally {
      setIsCheckingMember(false);
    }
  }, [activeBranch?.id]);

  // Reset member status when customer is cleared
  useEffect(() => {
    if (!foundCustomer) {
      setMemberStatus(null);
    } else if (foundCustomer.id) {
      checkMemberStatus(foundCustomer.id);
    }
  }, [foundCustomer, checkMemberStatus]);

  // Listen for receipt print event
  useEffect(() => {
    const handleOpenReceipt = (event: Event) => {
      const customEvent = event as CustomEvent;
      setReceiptData(customEvent.detail);
      setShowReceiptDialog(true);
    };

    window.addEventListener("open-receipt-print", handleOpenReceipt);
    return () => window.removeEventListener("open-receipt-print", handleOpenReceipt);
  }, []);

  // Inline customer search - debounced
  useEffect(() => {
    if (!customerName || customerName.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(customerName)}`);
        const data = await response.json();
        setSearchResults(data.customers || []);
        setShowSearchDropdown(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerName]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter services from API
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || service.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, activeCategory]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.service.price * item.quantity, 0);
  
  // Get discount from store (includes both manual and coupon discounts)
  const discountAmount = getDiscountAmount();
  const total = Math.max(0, subtotal - discountAmount);

  // Apply coupon handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || subtotal === 0) return;
    
    setIsApplyingCoupon(true);
    setCouponError(null);
    
    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          orderAmount: subtotal,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setCouponError(data.error || "Kupon tidak valid");
        return;
      }
      
      setAppliedCoupon({
        code: data.coupon.code,
        type: data.coupon.type,
        value: data.coupon.value,
        discount: data.discount,
      });
      
      // Update cart store with coupon discount
      setDiscount(data.coupon.value, data.coupon.type);
    } catch (err) {
      setCouponError("Gagal menerapkan kupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Remove coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    // Clear discount from cart store
    setDiscount(0, "percentage");
  };

  // Select customer from inline search
  const handleSelectCustomer = (customer: any) => {
    reset((prev) => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
    }));
    setShowSearchDropdown(false);
    setSearchResults([]);
    gooeyToast.success("Pelanggan dipilih", {
      description: `${customer.name} (${customer.phone})`,
    });
  };

  // Cart handlers (using Zustand store)
  const handleAddToCart = (service: LaundryService) => {
    addToCart(service);
  };

  const handleUpdateQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(serviceId);
      return;
    }
    updateQuantity(serviceId, quantity);
  };

  const handleRemoveFromCart = (serviceId: string) => {
    removeFromCart(serviceId);
  };

  const handleClearCart = () => {
    clearCartStore();
    reset({ customerName: "", customerPhone: "" });
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    setPaymentMethod(null);
  };

  // Checkout handler - validates and processes order
  const handleCheckout = async () => {
    console.log("[POS] handleCheckout called, activeBranch:", activeBranch?.id);
    
    // Validate customer info first
    const isCustomerValid = await trigger();
    console.log("[POS] Customer valid:", isCustomerValid, "paymentMethod:", paymentMethod, "cart length:", cart.length);
    
    if (!isCustomerValid || !paymentMethod || cart.length === 0 || !activeBranch) {
      console.log("[POS] Validation failed, returning early");
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate member discount
      let memberDiscountAmount = 0;
      if (memberStatus?.eligible && memberStatus.discountValue) {
        if (memberStatus.discountType === "percentage") {
          memberDiscountAmount = (subtotal * memberStatus.discountValue) / 100;
        } else {
          memberDiscountAmount = Math.min(memberStatus.discountValue, subtotal);
        }
      }

      // Build order data matching CreateOrderInput schema
      const orderData = {
        branchId: activeBranch.id,
        customerName,
        customerPhone,
        items: cart.map((item) => ({
          serviceId: item.service.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        // Send discount VALUE (not amount) so API can calculate correctly
        discount: cartStore.discount > 0 ? cartStore.discount : (memberStatus?.discountValue || undefined),
        discountType: cartStore.discount > 0 ? cartStore.discountType : (memberStatus?.discountType || undefined),
        couponCode: appliedCoupon?.code,
        paymentMethod,
        // Member package info
        memberSubscriptionId: memberStatus?.eligible ? memberStatus.subscriptionId : undefined,
        memberDiscount: memberDiscountAmount > 0 ? memberDiscountAmount : undefined,
        // Auto-create customer
        saveAsCustomer: saveAsCustomer && !foundCustomer,
      };

      console.log("Creating order:", orderData);

      // Call API via hook
      const newOrder = await createOrder(orderData);

      if (newOrder) {
        const orderNumber = newOrder.orderNumber || newOrder.id;

        // Store order details for receipt printing
        const orderDetails = {
          items: cart.map((item) => ({
            serviceName: item.service.name,
            quantity: item.quantity,
            unit: item.service.unit,
            pricePerUnit: item.service.price,
            subtotal: item.service.price * item.quantity,
          })),
          subtotal: subtotal,
          discount: discountAmount,
          discountType: cartStore.discount > 0 ? cartStore.discountType : (appliedCoupon ? "fixed" : undefined),
          total: total,
          paymentMethod: paymentMethod || "cash",
          estimatedCompletionAt: new Date(newOrder.estimatedCompletionAt),
        };
        
        setLastOrderId(orderNumber);
        setLastOrderDetails(orderDetails);
        setShowCheckoutDialog(false);
        
        // Check if this is a digital payment (QRIS or Transfer)
        const isDigitalPayment = paymentMethod === "qris" || paymentMethod === "transfer";
        
        if (isDigitalPayment) {
          // Open QRIS payment dialog for digital payments
          setPendingPaymentOrder({
            id: newOrder.id,
            orderNumber: orderNumber,
            total: total,
            customerName: customerName,
          });
          setShowPaymentDialog(true);
          showToast("success", "Order dibuat! Silakan scan QR untuk pembayaran.");
        } else {
          // Cash or E-Wallet (manual) - show success immediately
          setShowSuccessDialog(true);
          showToast("success", "Order berhasil dibuat!");
        }
        
        // Send WhatsApp notification (fire and forget - don't block UI)
        sendWhatsAppNotification(newOrder, orderNumber, isDigitalPayment);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal membuat order";
      showToast("error", message);
      console.error("Checkout error:", err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper function to send WhatsApp notification
  const sendWhatsAppNotification = async (
    newOrder: { estimatedCompletionAt?: string | Date }, 
    orderNumber: string,
    isDigitalPayment: boolean
  ) => {
    try {
      const paymentStatus = paymentMethod === "cash" 
        ? "Lunas (Cash)" 
        : isDigitalPayment 
          ? "Menunggu Pembayaran Digital" 
          : "Bayar di Tempat";

      const trackingUrl = `${window.location.origin}/track?order=${orderNumber}`;
          
      const message = `Halo ${customerName}! 

Terima kasih telah menggunakan VibeClean Laundry.

📋 Detail Order:
• No. Order: ${orderNumber}
• Total: Rp ${total.toLocaleString("id-ID")}
• Status: ${paymentStatus}

📍 Estimasi Selesai:
${newOrder.estimatedCompletionAt ? new Date(newOrder.estimatedCompletionAt).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Akan diinformasikan"}

🔍 Lacak Pesanan:
${trackingUrl}

Terima kasih! 🙏`;

      await fetch("/api/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customerPhone,
          message,
        }),
      });
    } catch (waError) {
      // Don't block the flow if WhatsApp fails
      console.error("WhatsApp notification failed:", waError);
    }
  };
  
  // Handle payment success callback from QRIS dialog
  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setPendingPaymentOrder(null);
    setShowSuccessDialog(true);
    showToast("success", "Pembayaran berhasil diterima!");
  };
  
  // Handle payment expired callback from QRIS dialog
  const handlePaymentExpired = () => {
    // User can retry or close - dialog handles this
    showToast("warning", "Waktu pembayaran habis. Silakan buat pembayaran baru.");
  };
  
  // Handle payment dialog close (user chose "Bayar Nanti")
  const handlePaymentDialogClose = (open: boolean) => {
    if (!open) {
      setShowPaymentDialog(false);
      // Still show success dialog - order was created, just not paid yet
      setShowSuccessDialog(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    setLastOrderId(null);
    setLastOrderDetails(null);
    setPendingPaymentOrder(null);
    handleClearCart();
  };

  const handlePrintReceipt = () => {
    if (!lastOrderDetails || !lastOrderId) return;
    
    openReceiptWindow({
      orderNumber: lastOrderId,
      customerName: customerName || "Pelanggan",
      customerPhone: customerPhone || "-",
      items: lastOrderDetails.items,
      subtotal: lastOrderDetails.subtotal,
      discount: lastOrderDetails.discount,
      discountType: lastOrderDetails.discountType,
      total: lastOrderDetails.total,
      paymentMethod: lastOrderDetails.paymentMethod,
      paidAmount: lastOrderDetails.total,
      estimatedCompletionAt: lastOrderDetails.estimatedCompletionAt,
    });
  };

  // Category tabs
  const categories: { value: ServiceCategory | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "cuci", label: "Cuci" },
    { value: "setrika", label: "Setrika" },
    { value: "cuci_setrika", label: "Cuci+Setrika" },
    { value: "dry_clean", label: "Dry Clean" },
    { value: "express", label: "Express" },
    { value: "khusus", label: "Khusus" },
  ];

  // Auth check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <a href="/login" className="text-blue-600 hover:underline">
          Silakan login untuk mengakses POS
        </a>
      </div>
    );
  }

  return (
    <PermissionGuard 
      feature="pos"
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Anda tidak memiliki akses ke halaman ini</p>
        </div>
      }
    >
      <>
        <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-12rem)]">
          {/* Left: Service Selection */}
          <div className="flex-1 flex flex-col min-h-0 lg:min-h-full">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari layanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ServiceCategory | "all")} className="mb-4">
              <TabsList className="flex flex-wrap h-auto gap-1 w-full overflow-x-auto">
                {categories.map((cat) => (
                  <TabsTrigger key={cat.value} value={cat.value} className="text-xs whitespace-nowrap">
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Service Grid */}
            <ScrollArea className="flex-1 max-h-[40vh] lg:max-h-none">
              {servicesLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Memuat layanan...</p>
                </div>
              ) : servicesError ? (
                <div className="flex flex-col items-center justify-center py-8 text-red-400">
                  <p className="text-sm">Gagal memuat layanan</p>
                  <p className="text-xs">{servicesError}</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <p className="text-sm">Tidak ada layanan ditemukan</p>
                  <p className="text-xs">Tambahkan layanan di menu Services</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                  {filteredServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onAdd={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Cart */}
          <Card className="w-full lg:w-96 flex flex-col max-h-[50vh] lg:max-h-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Keranjang
                {cart.length > 0 && (
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {cart.length} item
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden flex flex-col pb-0">
              {/* Customer Info */}
              <div className="space-y-3 mb-4 customer-search-container">
                <div className="space-y-1 relative">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Nama pelanggan"
                      {...register("customerName")}
                      className={`pl-10 ${errors.customerName ? "border-red-500" : ""}`}
                      autoComplete="off"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowCustomerSearch(true)}
                      disabled={showSearchDropdown}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    
                    {/* Inline Search Dropdown */}
                    {showSearchDropdown && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-0"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{customer.name}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{customer.phone}</span>
                                </div>
                                {customer.totalOrders !== undefined && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {customer.totalOrders} order • {formatCurrency(customer.totalSpent || 0)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.customerName && (
                    <p className="text-xs text-red-500">{errors.customerName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Nomor HP (08xxxxxxxx)"
                      {...register("customerPhone")}
                      className={`pl-10 ${errors.customerPhone ? "border-red-500" : ""}`}
                    />
                    {isLookingUp && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  {errors.customerPhone && (
                    <p className="text-xs text-red-500">{errors.customerPhone.message}</p>
                  )}
                  {foundCustomer && !errors.customerPhone && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-green-700 dark:text-green-400">
                        Pelanggan terdaftar: {foundCustomer.name} ({foundCustomer.totalOrders} orders)
                      </span>
                    </div>
                  )}
                  
                  {/* Member Package Status */}
                  {isCheckingMember && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-blue-700 dark:text-blue-400">
                        Memeriksa status member...
                      </span>
                    </div>
                  )}
                  
                  {memberStatus && foundCustomer && (
                    memberStatus.eligible ? (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-amber-700 dark:text-amber-300">
                            🎫 Member: {memberStatus.packageName}
                          </span>
                          {memberStatus.discountValue && (
                            <span className="text-amber-600 dark:text-amber-400">
                              ({memberStatus.discountType === 'percentage' ? `${memberStatus.discountValue}%` : formatCurrency(memberStatus.discountValue)} off)
                            </span>
                          )}
                        </div>
                        {memberStatus.remainingTransactions !== null && memberStatus.remainingTransactions !== undefined && (
                          <div className="text-amber-600 dark:text-amber-400">
                            Sisa: {memberStatus.remainingTransactions}x bulan ini
                          </div>
                        )}
                      </div>
                    ) : (
                      memberStatus.message && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/20 rounded text-xs">
                          <span className="text-gray-500">ℹ️ {memberStatus.message}</span>
                        </div>
                      )
                    )
                  )}

                  {/* Save as Customer Checkbox */}
                  {!foundCustomer && customerPhone.length >= 4 && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                      <Checkbox
                        checked={saveAsCustomer}
                        onCheckedChange={(checked) => setSaveAsCustomer(checked as boolean)}
                      />
                      <span>Simpan sebagai pelanggan tetap</span>
                    </label>
                  )}
                </div>
              </div>

              <Separator className="mb-3" />

              {/* Cart Items */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <ShoppingCart className="w-12 h-12 mb-2" />
                    <p className="text-sm">Keranjang kosong</p>
                    <p className="text-xs">Pilih layanan di sebelah kiri</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <CartItemRow
                      key={item.service.id}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveFromCart}
                    />
                  ))
                )}
              </ScrollArea>
            </CardContent>

            {/* Cart Footer */}
            <CardFooter className="flex-col gap-3 pt-4 border-t">
              {/* Discount (Manager+ only) */}
              <PermissionGuard roles={["owner", "manager"]} hideOnly>
                <div className="w-full space-y-2">
                  <Label className="text-xs text-gray-500">Diskon</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="0"
                        value={cartStore.discount || ""}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0, cartStore.discountType)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant={cartStore.discountType === "percentage" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDiscount(cartStore.discount, "percentage")}
                    >
                      %
                    </Button>
                    <Button
                      variant={cartStore.discountType === "fixed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDiscount(cartStore.discount, "fixed")}
                    >
                      Rp
                    </Button>
                  </div>
                </div>
              </PermissionGuard>

              {/* Coupon Input */}
              {cart.length > 0 && !appliedCoupon && (
                <div className="w-full space-y-2">
                  <Label className="text-xs text-gray-500">Kupon Diskon</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Masukkan kode kupon"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                    >
                      {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pakai"}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500">{couponError}</p>
                  )}
                </div>
              )}

              {/* Applied Coupon Display */}
              {appliedCoupon && (
                <div className="w-full p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        🎫 {appliedCoupon.code}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        -{formatCurrency(appliedCoupon.discount)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-green-700 hover:text-green-900"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="w-full space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {/* Member Discount */}
                {memberStatus?.eligible && memberStatus.discountValue && (
                  <div className="flex justify-between text-amber-600">
                    <span>Diskon Member ({memberStatus.discountType === 'percentage' ? `${memberStatus.discountValue}%` : formatCurrency(memberStatus.discountValue)})</span>
                    <span>-{formatCurrency((memberStatus.discountType === 'percentage' ? (subtotal * memberStatus.discountValue / 100) : Math.min(memberStatus.discountValue, subtotal)))}</span>
                  </div>
                )}

                {/* Manual/Coupon Discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon {cartStore.discountType === 'percentage' ? `${cartStore.discount}%` : formatCurrency(cartStore.discount)}</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    // Trigger validation before showing checkout dialog
                    trigger().then((valid) => {
                      if (valid && cart.length > 0) {
                        setShowCheckoutDialog(true);
                      }
                    });
                  }}
                  disabled={cart.length === 0 || !isValid}
                >
                  Bayar
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Checkout Dialog */}
        <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
              <DialogDescription>
                Pilih metode pembayaran untuk menyelesaikan transaksi
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pelanggan</span>
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">HP</span>
                  <span>{customerPhone}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Jumlah Item</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <Label className="mb-2 block">Metode Pembayaran</Label>
                <PaymentMethodSelector
                  selected={paymentMethod}
                  onSelect={setPaymentMethod}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>
                Batal
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={!paymentMethod || isProcessing}
              >
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isProcessing ? "Memproses..." : "Konfirmasi Bayar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-sm text-center">
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <DialogTitle className="mb-2">Transaksi Berhasil!</DialogTitle>
              <DialogDescription>
                Order #{lastOrderId || "..."} telah dibuat.
                <br />
                {pendingPaymentOrder ? "Pembayaran telah diterima." : "Notifikasi akan dikirim ke WhatsApp pelanggan."}
              </DialogDescription>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handlePrintReceipt}
                className="flex-1 h-11 border-2 hover:bg-gray-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Nota
              </Button>
              <Button onClick={handleSuccessClose} className="flex-1 h-11 bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Selesai
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* QRIS Payment Dialog */}
        {pendingPaymentOrder && (
          <PaymentQRISDialog
            open={showPaymentDialog}
            onOpenChange={handlePaymentDialogClose}
            orderId={pendingPaymentOrder.id}
            orderNumber={pendingPaymentOrder.orderNumber}
            amount={pendingPaymentOrder.total}
            customerName={pendingPaymentOrder.customerName}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentExpired={handlePaymentExpired}
          />
        )}

        {/* Customer Search Dialog */}
        <CustomerSearchDialog
          open={showCustomerSearch}
          onOpenChange={setShowCustomerSearch}
          onSelect={(customer) => {
            // Auto-fill customer name and phone
            reset((prev) => ({
              ...prev,
              customerName: customer.name,
              customerPhone: customer.phone,
            }));
            
            // Trigger customer lookup to update member status
            setTimeout(() => {
              checkMemberStatus(customer.id, 0);
            }, 100);
            
            gooeyToast.success("Pelanggan dipilih", {
              description: `${customer.name} (${customer.phone})`,
            });
          }}
        />

        {/* Receipt Print Dialog */}
        {showReceiptDialog && receiptData && (
          <ReceiptPrint
            data={{
              ...receiptData,
              branchName: activeBranch?.name || "VibeClean Laundry",
              branchPhone: activeBranch?.phone || "-",
              createdAt: new Date(),
            }}
            onClose={() => setShowReceiptDialog(false)}
          />
        )}
      </>
    </PermissionGuard>
  );
}
