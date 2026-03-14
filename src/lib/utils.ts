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

/**
 * Authenticated fetch wrapper that includes credentials (cookies) with every request.
 * Use this for all authenticated API calls to ensure session cookies are sent.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}
