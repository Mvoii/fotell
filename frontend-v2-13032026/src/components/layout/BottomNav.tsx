"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  TrendingUp,
  ArrowUpDown,
  Eye,
  User,
  Shield,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useNavigation, type NavigationTab } from '@/hooks/useNavigation';

interface BottomNavProps {
  pendingOrdersCount?: number;
  unreadAlertsCount?: number;
  onTradePress?: () => void;
}

interface NavItem {
  id: NavigationTab | 'admin' | 'settings';
  label: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  badge?: number;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function BottomNav({
  pendingOrdersCount = 0,
  unreadAlertsCount = 0,
  onTradePress
}: BottomNavProps) {
  const pathname = usePathname();
  const { data: user } = useUser();
  const { activeTab, navigateToTab, openTradeSheet } = useNavigation();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      href: '/dashboard',
      badge: unreadAlertsCount,
      requireAuth: true,
    },
    {
      id: 'markets',
      label: 'Markets',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/markets',
    },
    {
      id: 'trade',
      label: 'Trade',
      icon: <ArrowUpDown className="h-5 w-5" />,
      action: onTradePress || openTradeSheet,
      requireAuth: true,
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: <User className="h-5 w-5" />,
      href: '/portfolio',
      badge: pendingOrdersCount,
      requireAuth: true,
    },
  ];

  // Admin-only items shown in an overflow menu on mobile
  const adminItems: NavItem[] = [
    {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-5 w-5" />,
      href: '/admin',
      requireAuth: true,
      requireAdmin: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      href: '/settings',
      requireAuth: true,
    },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.requireAuth && !user) return false;
    return true;
  });

  const filteredAdminItems = adminItems.filter(item => {
    if (item.requireAuth && !user) return false;
    if (item.requireAdmin && user?.role !== 'ADMIN') return false;
    return true;
  });

  const handleItemClick = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else if (item.id === 'trade') {
      navigateToTab('trade');
    }
  };

  const isItemActive = (itemId: string) => {
    return activeTab === itemId;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {/* Primary nav items - show up to 5, or fewer if admin items exist */}
        {filteredNavItems.map((item) => {
          const isActive = isItemActive(item.id);

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-1 w-full transition-colors relative",
                  isActive
                    ? "text-accent-blue"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center" aria-hidden="true">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-1 h-1 bg-accent-blue rounded-full" aria-hidden="true"></div>
                )}
              </Link>
            );
          }

          // Action button (e.g., Trade)
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-1 w-full transition-colors relative",
                isActive
                  ? "text-accent-blue"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center" aria-hidden="true">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-1 h-1 bg-accent-blue rounded-full" aria-hidden="true"></div>
              )}
            </button>
          );
        })}

        {/* More menu for admin/settings on mobile - Only show if there are filtered admin items */}
        {filteredAdminItems.length > 0 && (
          <div className="relative group">
            <button
              className="flex flex-col items-center justify-center gap-1 px-3 py-1 w-full transition-colors text-muted-foreground hover:text-foreground"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded="false"
            >
              <div className="relative">
                <Settings className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">More</span>
            </button>

            {/* Dropdown menu for admin items */}
            <div
              className="absolute bottom-full right-0 mb-2 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
              role="menu"
            >
              {filteredAdminItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted first:rounded-t-lg last:rounded-b-lg transition-colors"
                  role="menuitem"
                >
                  <span className="flex-shrink-0 text-muted-foreground">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
