"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { formatCurrency } from "@/lib/utils";
import { useServices } from "@/hooks/use-services";
import { useOrders } from "@/hooks/use-orders";
import { gooeyToast } from "goey-toast";
import type { LaundryService, PaymentMethod, ServiceCategory } from "@/types";

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
      <span className="font-medium text-gray-900 dark:text-white">
        {service.name}
      </span>
      <span className="text-sm text-gray-500 mt-1">
        {formatCurrency(service.price)} / {service.unit}
      </span>
      <span className="text-xs text-gray-400 mt-2">
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

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "all">("all");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

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
  const discountAmount = discountType === "percentage" 
    ? (subtotal * discount) / 100 
    : discount;
  const total = Math.max(0, subtotal - discountAmount);

  // Cart handlers
  const addToCart = (service: LaundryService) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  };

  const updateQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(serviceId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.service.id === serviceId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (serviceId: string) => {
    setCart((prev) => prev.filter((item) => item.service.id !== serviceId));
  };

  const clearCart = () => {
    setCart([]);
    reset({ customerName: "", customerPhone: "" });
    setDiscount(0);
    setPaymentMethod(null);
  };

  // Checkout handler - validates and processes order
  const handleCheckout = async () => {
    // Validate customer info first
    const isCustomerValid = await trigger();
    if (!isCustomerValid || !paymentMethod || cart.length === 0 || !activeBranch) {
      return;
    }

    setIsProcessing(true);
    
    try {
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
        discount: discount > 0 ? discount : undefined,
        discountType: discount > 0 ? discountType : undefined,
        paymentMethod,
      };

      console.log("Creating order:", orderData);

      // Call API via hook
      const newOrder = await createOrder(orderData);
      
      if (newOrder) {
        setLastOrderId(newOrder.orderNumber || newOrder.id);
        setShowCheckoutDialog(false);
        setShowSuccessDialog(true);
        gooeyToast.success("Order berhasil dibuat!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal membuat order";
      gooeyToast.error(message);
      console.error("Checkout error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    clearCart();
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
    <DashboardLayout title="Kasir (POS)">
      <PermissionGuard 
        feature="pos"
        fallback={
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Anda tidak memiliki akses ke halaman ini</p>
          </div>
        }
      >
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
                      onAdd={addToCart}
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
              <div className="space-y-3 mb-4">
                <div className="space-y-1">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Nama pelanggan"
                      {...register("customerName")}
                      className={`pl-10 ${errors.customerName ? "border-red-500" : ""}`}
                    />
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
                  </div>
                  {errors.customerPhone && (
                    <p className="text-xs text-red-500">{errors.customerPhone.message}</p>
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
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
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
                        value={discount || ""}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant={discountType === "percentage" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDiscountType("percentage")}
                    >
                      %
                    </Button>
                    <Button
                      variant={discountType === "fixed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDiscountType("fixed")}
                    >
                      Rp
                    </Button>
                  </div>
                </div>
              </PermissionGuard>

              {/* Totals */}
              <div className="w-full space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon</span>
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
                  onClick={clearCart}
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
                Notifikasi akan dikirim ke WhatsApp pelanggan.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button onClick={handleSuccessClose} className="w-full">
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </DashboardLayout>
  );
}
