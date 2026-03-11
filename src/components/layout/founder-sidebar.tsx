"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { verifyFounderSession, clearFounderSession } from "@/lib/founder-auth";

const founderNavItems = [
  {
    title: "Overview",
    href: "/founder/dashboard",
    icon: BarChart3,
  },
  {
    title: "Organizations",
    href: "/founder/dashboard/organizations",
    icon: Building2,
  },
  {
    title: "Revenue",
    href: "/founder/dashboard/revenue",
    icon: DollarSign,
  },
  {
    title: "Subscriptions",
    href: "/founder/dashboard/subscriptions",
    icon: CreditCard,
  },
];

const bottomNavItems = [
  {
    title: "Settings",
    href: "/founder/settings",
    icon: Settings,
  },
];

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  title: string;
  isActive: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

function NavItem({ href, icon: Icon, title, isActive, onClick, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-foreground",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", collapsed && "h-6 w-6")} />
      {!collapsed && <span className="text-sm font-medium">{title}</span>}
    </Link>
  );
}

interface SidebarProps {
  collapsed?: boolean;
}

export function FounderSidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/founder/logout", { method: "POST" });
      router.push("/founder/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={cn("flex h-full flex-col border-r bg-card", collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center")}>
        {!collapsed && (
          <Link href="/founder/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">VibeClean</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {founderNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              isActive={pathname === item.href || (item.href !== "/founder/dashboard" && pathname.startsWith(item.href))}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="border-t p-2 space-y-1">
        {bottomNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            title={item.title}
            isActive={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-destructive"
          )}
        >
          <LogOut className={cn("h-5 w-5", collapsed && "h-6 w-6")} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );
}

export function FounderSidebarMobile() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/founder/logout", { method: "POST" });
      router.push("/founder/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/founder/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">VibeClean</span>
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-3.5rem)] py-4">
          <nav className="space-y-1 px-2">
            {founderNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-foreground",
                  pathname === item.href || (item.href !== "/founder/dashboard" && pathname.startsWith(item.href))
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>
          <div className="border-t mt-4 pt-4 px-2 space-y-1">
            <Link
              href="/founder/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-foreground",
                pathname === "/founder/settings"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Keluar
            </button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
