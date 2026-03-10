"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

// ============================================
// VARIANT CONFIG
// ============================================

const variantConfig: Record<
  ConfirmVariant,
  {
    iconBg: string;
    iconColor: string;
    buttonClass: string;
    defaultIcon: React.ReactNode;
  }
> = {
  danger: {
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
    defaultIcon: <Trash2 className="h-5 w-5" />,
  },
  warning: {
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    defaultIcon: <AlertTriangle className="h-5 w-5" />,
  },
  info: {
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    defaultIcon: <AlertTriangle className="h-5 w-5" />,
  },
};

// ============================================
// CONFIRM DIALOG COMPONENT
// ============================================

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  onConfirm,
  variant = "danger",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const config = variantConfig[variant];
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Confirm action failed:", error);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex flex-col items-center text-center gap-3 pb-2">
          <div className={cn("p-3 rounded-full", config.iconBg, config.iconColor)}>
            {icon || config.defaultIcon}
          </div>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn("w-full sm:w-auto", config.buttonClass)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// DELETE CONFIRM DIALOG (Shorthand)
// ============================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType = "item",
  onConfirm,
  isLoading,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${itemType}?`}
      description={`Apakah Anda yakin ingin menghapus "${itemName}"? Tindakan ini tidak dapat dibatalkan.`}
      confirmLabel="Hapus"
      cancelLabel="Batal"
      onConfirm={onConfirm}
      variant="danger"
      isLoading={isLoading}
    />
  );
}

// ============================================
// CANCEL ORDER CONFIRM DIALOG
// ============================================

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading,
}: CancelOrderDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Batalkan Order?"
      description={`Apakah Anda yakin ingin membatalkan order ${orderNumber}? Status order akan berubah menjadi dibatalkan.`}
      confirmLabel="Ya, Batalkan"
      cancelLabel="Tidak"
      onConfirm={onConfirm}
      variant="warning"
      isLoading={isLoading}
      icon={<X className="h-5 w-5" />}
    />
  );
}
