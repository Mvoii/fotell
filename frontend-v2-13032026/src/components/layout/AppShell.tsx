"use client";

import React, { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  TrendingUp,
  ArrowUpDown,
  User,
  Settings,
  Shield,
  LogOut
} from 'lucide-react';
import { TopNav } from './TopNav';
import { LeftSidebar } from './LeftSidebar';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useNavigation, type NavigationTab } from '@/hooks/useNavigation';

interface MobileNavigationItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  requireAdmin?: boolean;
  onClick: () => void;
}

function MobileNavigationItem({
  href,
  icon,
  label,
  isActive = false,
  onClick
}: MobileNavigationItemProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!href.startsWith('#')) {
      router.push(href);
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-left",
        isActive
          ? "bg-accent-blue text-white"
          : "hover:bg-muted text-foreground"
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={cn(
        "flex-shrink-0",
        isActive ? "text-white" : "text-muted-foreground-foreground"
      )}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  /** Show top navbar for all pages */
  showTopNav?: boolean;
  /** Show left sidebar for authenticated users */
  showLeftSidebar?: boolean;
  /** Show bottom nav for mobile authenticated users */
  showBottomNav?: boolean;
  /** User authentication status - optional, will use useUser if not provided */
  isAuthenticated?: boolean;
  topNavProps?: {
    transparent?: boolean;
    showSearch?: boolean;
  };
  bottomNavProps?: {
    onTradePress?: () => void;
  };
}

export function AppShell({
  children,
  showTopNav = true,
  showLeftSidebar = true,
  showBottomNav = true,
  isAuthenticated: propIsAuthenticated,
  topNavProps = {},
  bottomNavProps = {},
}: AppShellProps) {
  const { data: user } = useUser();
  const pathname = usePathname();
  const {
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarCollapsed,
    navigateToTab,
    activeTab
  } = useNavigation();

  // Determine authentication status from props or user data
  const isAuthenticated = propIsAuthenticated ?? !!user;
  const isAdmin = user?.role === 'ADMIN';

  const handleTradePress = useCallback(() => {
    navigateToTab('trade');
    bottomNavProps?.onTradePress?.();
  }, [navigateToTab, bottomNavProps]);

  const handleLogout = useCallback(() => {
    // TODO: Implement logout logic
    console.log('Logout clicked');
    setMobileMenuOpen(false);
  }, [setMobileMenuOpen]);

  const handleMobileNav = useCallback((tab: NavigationTab) => {
    navigateToTab(tab);
  }, [navigateToTab]);

  // Show left/bottom nav only for authenticated users
  const shouldShowSidebar = showLeftSidebar && isAuthenticated;
  const shouldShowBottomNav = showBottomNav && isAuthenticated;

  // Calculate main content margins based on sidebar state
  const mainContentClasses = cn(
    "flex-1 min-h-screen transition-all duration-200",
    // Account for top nav
    showTopNav && "pt-16",
    // Desktop: account for sidebar width when visible
    shouldShowSidebar && [
      "lg:ml-16",
      !sidebarCollapsed && "lg:ml-64"
    ],
    // Mobile: account for bottom nav
    shouldShowBottomNav && "pb-14"
  );

  // Mobile menu navigation items
  const mobileNavItems: { id: NavigationTab; label: string; icon: React.ReactNode; href: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, href: '/dashboard' },
    { id: 'markets', label: 'Markets', icon: <TrendingUp className="h-5 w-5" />, href: '/markets' },
    { id: 'portfolio', label: 'Portfolio', icon: <User className="h-5 w-5" />, href: '/portfolio' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation - shown for all pages */}
      {showTopNav && (
        <TopNav
          {...topNavProps}
          showMenuButton={shouldShowSidebar}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
      )}

      <div className="flex">
        {/* Left Sidebar - Desktop only, authenticated users only */}
        {shouldShowSidebar && <LeftSidebar />}

        {/* Main Content */}
        <main className={mainContentClasses}>
          <div className="w-full min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile only, authenticated users only */}
      {shouldShowBottomNav && (
        <BottomNav
          {...bottomNavProps}
          onTradePress={handleTradePress}
        />
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && shouldShowSidebar && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Menu Panel */}
          <div
            id="mobile-navigation"
            className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border lg:hidden flex flex-col"
            role="dialog"
            aria-label="Mobile navigation menu"
            aria-modal="true"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <span className="font-bold text-lg">FoTell</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* User info section */}
            {user && (
              <div className="p-4 border-b border-border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-blue rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground-foreground">
                      {isAdmin ? 'Administrator' : 'User'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2" role="menu">
              {/* Primary Navigation */}
              <div className="space-y-1">
                {mobileNavItems.map((item) => (
                  <MobileNavigationItem
                    key={item.id}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeTab === item.id}
                    onClick={() => handleMobileNav(item.id)}
                  />
                ))}
                {/* Trade Action Button */}
                <button
                  onClick={() => {
                    handleTradePress();
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-left",
                    activeTab === 'trade'
                      ? "bg-accent-blue text-white"
                      : "hover:bg-muted text-foreground"
                  )}
                  aria-pressed={activeTab === 'trade'}
                >
                  <span className={cn(
                    "shrink-0",
                    activeTab === 'trade' ? "text-white" : "text-muted-foreground-foreground"
                  )}>
                    <ArrowUpDown className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">Trade</span>
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-border my-4" role="separator" />

              {/* Secondary Navigation */}
              <div className="space-y-1">
                <MobileNavigationItem
                  href="/settings"
                  icon={<Settings className={cn(
                    "h-5 w-5",
                    pathname === '/settings' ? "text-white" : "text-muted-foreground-foreground"
                  )} />}
                  label="Settings"
                  isActive={pathname === '/settings'}
                  onClick={() => setMobileMenuOpen(false)}
                />

                {isAdmin && (
                  <MobileNavigationItem
                    href="/admin"
                    icon={<Shield className={cn(
                      "h-5 w-5",
                      pathname === '/admin' ? "text-white" : "text-muted-foreground-foreground"
                    )} />}
                    label="Admin"
                    isActive={pathname === '/admin'}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-muted transition-colors text-left text-foreground"
                >
                  <span className="shrink-0 text-muted-foreground-foreground">
                    <LogOut className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground-foreground">
                © {new Date().getFullYear()} FoTell
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
