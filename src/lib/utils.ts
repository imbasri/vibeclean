import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || !isFinite(amount)) {
    return "Rp 0";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string {
  if (!date) return "-";
  
  let dateObj: Date;
  if (typeof date === "string") {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return "-";
  }
  
  if (!isFinite(dateObj.getTime())) {
    return "-";
  }
  
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

export function formatDateTime(date: Date): string {
  if (!date) return "-";
  
  let dateObj: Date;
  if (typeof date === "string") {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return "-";
  }
  
  if (!isFinite(dateObj.getTime())) {
    return "-";
  }
  
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}
