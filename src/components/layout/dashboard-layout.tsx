"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Store,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Shirt,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth, type FeatureKey } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggleSimple } from "@/components/common/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleBadge } from "@/components/common/permission-guard";
import { SubscriptionBadge } from "@/components/common/subscription-banner";
import { BranchSwitcher } from "./branch-switcher";

// ============================================
// NAVIGATION ITEMS
// ============================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: FeatureKey;
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  {
    title: "Kasir (POS)",
    href: "/dashboard/pos",
    icon: ShoppingCart,
    feature: "pos",
  },
  {
    title: "Pesanan",
    href: "/dashboard/orders",
    icon: ClipboardList,
    feature: "orders",
  },
  {
    title: "Layanan",
    href: "/dashboard/services",
    icon: Shirt,
    feature: "services",
  },
  {
    title: "Pelanggan",
    href: "/dashboard/customers",
    icon: Users,
    feature: "customers",
  },
  {
    title: "Paket Member",
    href: "/dashboard/members",
    icon: CreditCard,
    feature: "customers",
  },
  {
    title: "Laporan",
    href: "/dashboard/reports",
    icon: BarChart3,
    feature: "reports",
  },
  {
    title: "Karyawan",
    href: "/dashboard/staff",
    icon: Users,
    feature: "staff",
  },
  {
    title: "Cabang",
    href: "/dashboard/branches",
    icon: Store,
    feature: "branches",
  },
  {
    title: "Langganan",
    href: "/dashboard/billing",
    icon: CreditCard,
    feature: "billing",
  },
  {
    title: "Pengaturan",
    href: "/dashboard/settings",
    icon: Settings,
    feature: "settings",
  },
];

// ============================================
// SIDEBAR COMPONENT
// ============================================

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { canAccessFeature, user, activeRoles, logout } = useAuth();

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    canAccessFeature(item.feature)
  );

  return (
    <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Shirt className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">
          VibeClean
        </span>
      </div>

      {/* Branch Switcher */}
      <div className="px-4 py-3 border-b border-border">
        <BranchSwitcher />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Subscription Badge */}
        <div className="mt-4 px-1">
          <SubscriptionBadge />
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <Button {...props} variant="ghost" className="w-full justify-start gap-3 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.image} />
                  <AvatarFallback>
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {activeRoles.slice(0, 2).map((role) => (
                      <RoleBadge key={role} role={role} size="sm" />
                    ))}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={(props) => (
                <Link {...props} href="/dashboard/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Pengaturan
                </Link>
              )}
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// MOBILE SIDEBAR
// ============================================

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={(props) => (
          <Button {...props} variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
      />
      <SheetContent side="left" className="p-0 w-72">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// TOP BAR COMPONENT
// ============================================

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user, activeBranch } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex items-center h-16 px-4 border-b border-border bg-card lg:px-6">
      <MobileSidebar />

      <div className="flex-1 ml-4 lg:ml-0">
        {title && (
          <h1 className="text-lg font-semibold text-foreground">
            {title}
          </h1>
        )}
        {!title && activeBranch && (
          <p className="text-sm text-muted-foreground">
            {activeBranch.name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggleSimple />
        {/* Future: Notifications, Search, etc. */}
      </div>
    </header>
  );
}

// ============================================
// DASHBOARD LAYOUT
// ============================================

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - Sticky */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-0 h-screen">
          <Sidebar className="w-64" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
