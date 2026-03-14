"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  User,
  Phone,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  totalOrders: number;
  totalSpent: number;
}

interface CustomerSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
  onSelectWithPhone?: (customer: Customer) => void; // New callback for POS
}

export function CustomerSearchDialog({
  open,
  onOpenChange,
  onSelect,
  onSelectWithPhone,
}: CustomerSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus search input when dialog opens
  useEffect(() => {
    if (open && !showConfirmation && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open, showConfirmation]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.customers || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (selectedCustomer) {
      // If POS provides onSelectWithPhone, use it (auto-fill name and phone)
      if (onSelectWithPhone) {
        onSelectWithPhone(selectedCustomer);
      } else {
        onSelect(selectedCustomer);
      }
      resetDialog();
    }
  };

  const resetDialog = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCustomer(null);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  return (
    <>
      {/* Search Dialog */}
      <Dialog open={open && !showConfirmation} onOpenChange={(open) => {
        if (!open) resetDialog();
        else onOpenChange(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Cari Pelanggan
            </DialogTitle>
            <DialogDescription>
              Cari pelanggan berdasarkan nama atau nomor HP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  ref={searchInputRef}
                  placeholder="Ketik nama atau nomor HP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
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
                        {customer.totalOrders > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {customer.totalOrders} order • {formatCurrency(customer.totalSpent)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada pelanggan ditemukan</p>
                <p className="text-sm">Coba kata kunci lain</p>
              </div>
            )}

            {/* Initial State */}
            {searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Ketik minimal 2 karakter</p>
                <p className="text-sm">untuk mencari pelanggan</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={(open) => {
        if (!open) {
          setShowConfirmation(false);
          onOpenChange(true);
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pelanggan</DialogTitle>
            <DialogDescription>
              Apakah ini pelanggan Anda?
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                </div>
              </div>
              {selectedCustomer.totalOrders > 0 && (
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Order</p>
                    <p className="font-semibold">{selectedCustomer.totalOrders}x</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Belanja</p>
                    <p className="font-semibold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmation(false);
                onOpenChange(true);
              }}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Bukan
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Ya, Benar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
