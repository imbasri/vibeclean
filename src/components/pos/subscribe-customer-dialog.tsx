"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  User,
  Phone,
  Package,
  Calendar,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useMemberPackages, type MemberPackage } from "@/hooks/use-member-packages";
import { gooeyToast } from "goey-toast";

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalOrders?: number;
  totalSpent?: number;
}

interface SubscribeCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (data: {
    customerId: string;
    packageId: string;
    startDate: string;
    endDate: string;
    autoRenew: boolean;
  }) => Promise<void>;
}

export function SubscribeCustomerDialog({
  open,
  onOpenChange,
  onSubscribe,
}: SubscribeCustomerDialogProps) {
  const { packages, isLoading: packagesLoading } = useMemberPackages();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default dates
  useEffect(() => {
    if (open) {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    }
  }, [open]);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          setSearchResults(data.customers || []);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      gooeyToast.error("Pilih customer terlebih dahulu");
      return;
    }
    
    if (!selectedPackage) {
      gooeyToast.error("Pilih paket member");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubscribe({
        customerId: selectedCustomer.id,
        packageId: selectedPackage,
        startDate,
        endDate,
        autoRenew,
      });
      gooeyToast.success("Customer berhasil di-subscribe!");
      resetForm();
    } catch (error) {
      gooeyToast.error("Gagal subscribe customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCustomer(null);
    setSelectedPackage("");
    setAutoRenew(true);
    onOpenChange(false);
  };

  const selectedPackageData = packages.find(p => p.id === selectedPackage);

  return (
    <Dialog open={open} onOpenChange={resetForm}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Subscribe Customer
          </DialogTitle>
          <DialogDescription>
            Subscribe customer ke paket member untuk mendapatkan discount otomatis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Search Customer */}
            <div className="space-y-2">
              <Label htmlFor="search">Cari Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Ketik nama atau nomor HP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto border rounded-lg mt-2">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-0 ${
                        selectedCustomer?.id === customer.id ? "bg-accent" : ""
                      }`}
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
                        {selectedCustomer?.id === customer.id && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Customer */}
              {selectedCustomer && (
                <div className="p-3 border rounded-lg bg-muted/50 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Select Package */}
            <div className="space-y-2">
              <Label htmlFor="package">Pilih Paket Member</Label>
              <Select value={selectedPackage} onValueChange={(v) => setSelectedPackage(v || "")}>
                <SelectTrigger id="package" className="w-full">
                  <Package className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Pilih paket..." className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {packagesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : packages.filter(p => p.isActive).length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Tidak ada paket aktif
                    </div>
                  ) : (
                    packages.filter(p => p.isActive).map((pkg) => (
                      <SelectItem 
                        key={pkg.id} 
                        value={pkg.id}
                        className="truncate"
                      >
                        {pkg.name} ({pkg.discountType === "percentage" ? `${pkg.discountValue}%` : formatCurrency(pkg.discountValue)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Package Info */}
              {selectedPackageData && (
                <div className="p-3 border rounded-lg bg-muted/50 mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Harga:</span>
                    <span className="font-medium">{formatCurrency(selectedPackageData.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-green-600">
                      {selectedPackageData.discountType === "percentage" 
                        ? `${selectedPackageData.discountValue}%` 
                        : formatCurrency(selectedPackageData.discountValue)}
                    </span>
                  </div>
                  {selectedPackageData.maxTransactionsPerMonth && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Transaksi:</span>
                      <span className="font-medium">{selectedPackageData.maxTransactionsPerMonth}x/bln</span>
                    </div>
                  )}
                  {selectedPackageData.maxWeightKg && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Berat:</span>
                      <span className="font-medium">{selectedPackageData.maxWeightKg} kg</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Berakhir</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Auto Renew */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRenew"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="autoRenew" className="text-sm cursor-pointer">
                Auto renew (perpanjang otomatis)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedCustomer || !selectedPackage}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Subscribe Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
