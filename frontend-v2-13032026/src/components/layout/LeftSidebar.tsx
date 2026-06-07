"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  User,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useNavigation } from '@/hooks/useNavigation';
import { useLogout } from '@/hooks/useLogout';
import { Loader2 } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function LeftSidebar() {
  const pathname = usePathname();
  const { data: user } = useUser();
  const { sidebarCollapsed, toggleSidebar } = useNavigation();

  const navItems: NavItem[] = [
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: <User className="h-5 w-5" />,
      href: '/portfolio',
      requireAuth: true,
    },
    {
      id: 'markets',
      label: 'Markets',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/markets',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <Settings className="h-5 w-5" />,
      href: '/profile',
      requireAuth: true,
    },
  ];

  const secondaryItems: NavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      href: '/settings',
      requireAuth: true,
    },
    {
      id: 'admin',
      label: 'Dashboard',
      icon: <Shield className="h-5 w-5" />,
      href: '/admin',
      requireAuth: true,
      requireAdmin: true,
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <LogOut className="h-5 w-5" />,
      href: '#logout',
      requireAuth: true,
    },
  ];

  const isActive = (href: string) => {
    if (href === '#trade' || href === '#logout') return false;
    return pathname === href;
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.requireAuth && !user) return false;
    if (item.requireAdmin && user?.role !== 'ADMIN') return false;
    return true;
  });

  const filteredSecondaryItems = secondaryItems.filter(item => {
    if (item.requireAuth && !user) return false;
    if (item.requireAdmin && user?.role !== 'ADMIN') return false;
    return true;
  });

  const { logout: handleLogout, loading: loggingOut } = useLogout();

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const isAction = item.href.startsWith('#');

    const linkClasses = cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors group",
      active
        ? "bg-accent-blue text-white"
        : "text-muted-foreground-foreground hover:text-foreground hover:bg-muted"
    );

    if (isAction) {
      return (
        <button
          onClick={item.id === 'logout' ? handleLogout : undefined}
          className={linkClasses}
          aria-label={item.label}
          disabled={item.id === 'logout' && loggingOut}
        >
          <span className="flex-shrink-0" aria-hidden="true">
            {item.id === 'logout' && loggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              item.icon
            )}
          </span>
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </button>
      );
    }

    return (
      <Link
        href={item.href}
        className={linkClasses}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
      >
        <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 hidden lg:flex flex-col bg-background border-r border-border transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
      aria-label="Main navigation"
    >
      {/* Toggle button */}
      <div className="flex justify-end p-2">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-6 custom-scrollbar overflow-y-auto">
        {/* Primary navigation */}
        <div className="space-y-1" role="menubar">
          {filteredNavItems.map((item) => (
            <div key={item.id} role="none">
              <NavLink item={item} />
            </div>
          ))}
        </div>

        {/* Divider */}
        {!sidebarCollapsed && (
          <div className="border-t border-border my-4" role="separator"></div>
        )}

        {/* Secondary navigation */}
        <div className="space-y-1" role="menubar">
          {filteredSecondaryItems.map((item) => (
            <div key={item.id} role="none">
              <NavLink item={item} />
            </div>
          ))}
        </div>
      </nav>

      {/* User info (when expanded) */}
      {!sidebarCollapsed && user && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground-foreground truncate">
                {user.role === 'ADMIN' ? 'Administrator' : 'User'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
