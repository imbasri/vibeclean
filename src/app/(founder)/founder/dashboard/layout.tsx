'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
    Menu,
    BarChart3,
    Building2,
    DollarSign,
    CreditCard,
    Percent,
    Wallet,
    Package,
    TrendingDown,
    Settings,
} from 'lucide-react';

interface FounderLayoutProps {
    children: React.ReactNode;
}

interface NavItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
}

export default function FounderDashboardLayout({
    children,
}: FounderLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/founder/logout', { method: 'POST' });
            router.push('/'); // Redirect to home page
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSettings = () => {
        router.push('/founder/settings');
    };

    const founderNavItems: NavItem[] = [
        { title: 'Overview', url: '/founder/dashboard', icon: BarChart3 },
        {
            title: 'Organizations',
            url: '/founder/dashboard/organizations',
            icon: Building2,
        },
        {
            title: 'Revenue',
            url: '/founder/dashboard/revenue',
            icon: DollarSign,
        },
        {
            title: 'Subscriptions',
            url: '/founder/dashboard/subscriptions',
            icon: CreditCard,
        },
        {
            title: 'Transaction Fee',
            url: '/founder/dashboard/transaction-fee',
            icon: Percent,
        },
        {
            title: 'Withdrawals',
            url: '/founder/dashboard/withdrawals',
            icon: Wallet,
        },
        { title: 'Add-ons', url: '/founder/dashboard/addons', icon: Package },
        {
            title: 'Revenue Sharing',
            url: '/founder/dashboard/revenue-sharing',
            icon: TrendingDown,
        },
    ];

    const filteredNavItems = founderNavItems.map((item) => ({
        title: item.title,
        url: item.url,
        icon: item.icon,
        isActive:
            pathname === item.url ||
            (item.url !== '/founder/dashboard' &&
                pathname.startsWith(item.url)),
    }));

    return (
        <SidebarProvider defaultOpen={true}>
            {/* Desktop Sidebar */}
            <Sidebar collapsible="icon">
                <SidebarHeader className="flex h-14 items-center gap-2 border-b px-3">
                    <div className="flex justify-center items-center gap-2 ">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg shrink-0 overflow-hidden">
                            <img src="/logo_vibeclean.png" alt="VibeClean" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-1 flex-col justify-center min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="truncate text-sm font-semibold leading-tight">
                                VibeClean
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground leading-tight">
                                Founder Panel
                            </span>
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <NavMain items={filteredNavItems} />
                </SidebarContent>
                <SidebarFooter>
                    <div className="flex flex-col gap-1 p-2">
                        <button
                            type="button"
                            onClick={handleSettings}
                            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                            <Settings className="size-4" />
                            <span>Settings</span>
                        </button>
                        <NavUser
                            user={{
                                name: 'Founder',
                                email: 'founder@vibeclean.id',
                                avatar: '',
                            }}
                            onSettings={handleSettings}
                            onLogout={handleLogout}
                        />
                    </div>
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
                                        Founder Panel
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
                                        user={{
                                            name: 'Founder',
                                            email: 'founder@vibeclean.id',
                                            avatar: '',
                                        }}
                                        onSettings={handleSettings}
                                        onLogout={handleLogout}
                                    />
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <SidebarInset>
                {/* Mobile Header */}
                <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 lg:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                            <BarChart3 className="size-4" />
                        </div>
                        <div className="flex flex-col gap-0.5 leading-none transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0">
                            <span className="truncate text-sm font-semibold">
                                VibeClean
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground">
                                Founder Panel
                            </span>
                        </div>
                    </div>
                </header>

                {/* Desktop Header */}
                <header className="hidden lg:flex h-14 items-center gap-2 border-b bg-background px-4">
                    <SidebarTrigger />
                    <div className="flex-1" />
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
