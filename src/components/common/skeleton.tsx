"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// BASE SKELETON
// ============================================

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
    />
  );
}

// ============================================
// SKELETON TEXT
// ============================================

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 1, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// ============================================
// SKELETON CARD
// ============================================

interface SkeletonCardProps {
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}

export function SkeletonCard({
  hasImage = false,
  hasActions = false,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        className
      )}
    >
      {hasImage && <Skeleton className="h-32 w-full rounded-md" />}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
      {hasActions && (
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  );
}

// ============================================
// SKELETON TABLE ROW
// ============================================

interface SkeletonTableRowProps {
  columns?: number;
  hasAvatar?: boolean;
}

export function SkeletonTableRow({
  columns = 5,
  hasAvatar = false,
}: SkeletonTableRowProps) {
  return (
    <tr className="border-b">
      {hasAvatar && (
        <td className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </td>
      )}
      {Array.from({ length: hasAvatar ? columns - 1 : columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

// ============================================
// SKELETON TABLE
// ============================================

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  hasAvatar?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
  hasAvatar = false,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow
              key={i}
              columns={columns}
              hasAvatar={hasAvatar && i === 0 ? false : hasAvatar}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// SKELETON STATS CARDS
// ============================================

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export function SkeletonStats({ count = 4, className }: SkeletonStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// SKELETON PAGE (Full page loading)
// ============================================

interface SkeletonPageProps {
  hasStats?: boolean;
  hasTable?: boolean;
  className?: string;
}

export function SkeletonPage({
  hasStats = true,
  hasTable = true,
  className,
}: SkeletonPageProps) {
  return (
    <div className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      {hasStats && <SkeletonStats />}

      {/* Search */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Table */}
      {hasTable && (
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-32" />
          </div>
          <SkeletonTable rows={5} columns={5} hasAvatar />
        </div>
      )}
    </div>
  );
}

// ============================================
// SKELETON LIST (Mobile cards)
// ============================================

interface SkeletonListProps {
  count?: number;
  hasActions?: boolean;
  className?: string;
}

export function SkeletonList({
  count = 3,
  hasActions = true,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasActions={hasActions} />
      ))}
    </div>
  );
}

// ============================================
// LOADING BUTTON STATE
// ============================================

interface LoadingButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButtonContent({
  isLoading,
  loadingText,
  children,
}: LoadingButtonProps) {
  if (isLoading) {
    return (
      <>
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {loadingText || "Loading..."}
      </>
    );
  }
  return <>{children}</>;
}
