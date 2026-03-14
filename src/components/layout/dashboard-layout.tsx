'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { ThemeToggleSimple } from '@/components/common/theme-toggle';
import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarTrigger,
    SidebarInset,
    SidebarRail,
} from '@/components/ui/sidebar';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { BranchSwitcher } from './branch-switcher';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Menu,
    Shirt,
    LayoutDashboard,
    ShoppingCart,
    ClipboardList,
    Users,
    CreditCard,
    Award,
    BarChart3,
    Store,
    Wallet,
    Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
}

interface NavItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    feature:
        | 'dashboard'
        | 'pos'
        | 'orders'
        | 'services'
        | 'customers'
        | 'reports'
        | 'staff'
        | 'branches'
        | 'billing'
        | 'settings';
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
    const pathname = usePathname();
    const { activeBranch, canAccessFeature, user, logout } = useAuth();
    const { plan, canAccessFeature: canAccessSubscriptionFeature } = useSubscriptionStore();
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    // Combined feature access check (role + subscription)
    const canAccess = (feature: string) => {
        // Check subscription plan first
        if (!canAccessSubscriptionFeature(feature)) {
            return false;
        }
        // Then check role permissions
        return canAccessFeature(feature as any);
    };

    const NAV_ITEMS: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard',
            icon: LayoutDashboard,
            feature: 'dashboard',
        },
        {
            title: 'Kasir (POS)',
            url: '/dashboard/pos',
            icon: ShoppingCart,
            feature: 'pos',
        },
        {
            title: 'Pesanan',
            url: '/dashboard/orders',
            icon: ClipboardList,
            feature: 'orders',
        },
        {
            title: 'Layanan',
            url: '/dashboard/services',
            icon: Shirt,
            feature: 'services',
        },
        {
            title: 'Pelanggan',
            url: '/dashboard/customers',
            icon: Users,
            feature: 'customers',
        },
        {
            title: 'Paket Member',
            url: '/dashboard/members',
            icon: CreditCard,
            feature: 'customers',
        },
        {
            title: 'Loyalty / Kupon',
            url: '/dashboard/loyalty',
            icon: Award,
            feature: 'customers',
        },
        {
            title: 'Laporan & Analytics',
            url: '/dashboard/reports',
            icon: BarChart3,
            feature: 'reports',
        },
        {
            title: 'Karyawan',
            url: '/dashboard/staff',
            icon: Users,
            feature: 'staff',
        },
        {
            title: 'Cabang',
            url: '/dashboard/branches',
            icon: Store,
            feature: 'branches',
        },
        {
            title: 'Saldo & Tarik Dana',
            url: '/dashboard/balance',
            icon: Wallet,
            feature: 'billing',
        },
        {
            title: 'Langganan',
            url: '/dashboard/billing',
            icon: CreditCard,
            feature: 'billing',
        },
        {
            title: 'Pengaturan',
            url: '/dashboard/settings',
            icon: Settings,
            feature: 'settings',
        },
    ];

    const filteredNavItems = NAV_ITEMS.filter((item) =>
        canAccess(item.feature),
    ).map((item) => ({
        title: item.title,
        url: item.url,
        icon: item.icon,
        isActive: pathname === item.url,
    }));

    const userData = user
        ? {
              name: user.name || 'User',
              email: user.email || '',
              avatar: user.image || '',
          }
        : { name: 'User', email: '', avatar: '' };

    return (
        <SidebarProvider defaultOpen={true}>
            {/* Desktop Sidebar */}
            <Sidebar collapsible="icon">
                <SidebarHeader className="flex h-14 items-center gap-2 border-b px-3">
                    <div className="flex justify-start gap-2">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg shrink-0 overflow-hidden">
                            <img src="/logo_vibeclean.png" alt="VibeClean" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-1 flex-col justify-center min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="truncate text-sm font-semibold leading-tight">
                                VibeClean
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground leading-tight">
                                Laundry Management
                            </span>
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <NavMain items={filteredNavItems} />
                </SidebarContent>
                <SidebarFooter>
                    <NavUser
                        user={userData}
                        onSettings={() =>
                            (window.location.href = '/dashboard/settings')
                        }
                        onLogout={logout}
                    />
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            {/* Mobile Sidebar */}
            <div className="lg:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="p-0 w-72">
                        <div className="flex h-full flex-col">
                            {/* Mobile Header */}
                            <div className="flex h-14 items-center gap-2 border-b px-3">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg shrink-0 overflow-hidden">
                                    <img src="/logo_vibeclean.png" alt="VibeClean" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex flex-1 flex-col justify-center min-w-0">
                                    <span className="truncate text-sm font-semibold leading-tight">
                                        VibeClean
                                    </span>
                                    <span className="truncate text-[10px] text-muted-foreground leading-tight">
                                        Laundry Management
                                    </span>
                                </div>
                            </div>
                            {/* Mobile Content */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-2">
                                    <NavMain items={filteredNavItems} />
                                </div>
                                <div className="border-t p-2">
                                    <NavUser
                                        user={userData}
                                        onSettings={() =>
                                            (window.location.href =
                                                '/dashboard/settings')
                                        }
                                        onLogout={logout}
                                    />
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <SidebarInset>
                {/* Top Bar */}
                <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4">
                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {/* Desktop Sidebar Trigger */}
                    <SidebarTrigger className="hidden lg:inline-flex" />

                    {/* Branch Switcher */}
                    <div className="hidden sm:block">
                        <BranchSwitcher />
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                        {title ? (
                            <h1 className="text-sm font-semibold text-foreground truncate">
                                {title}
                            </h1>
                        ) : activeBranch ? (
                            <p className="text-xs text-muted-foreground truncate">
                                {activeBranch.name}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Dashboard
                            </p>
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1">
                        <ThemeToggleSimple />
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
