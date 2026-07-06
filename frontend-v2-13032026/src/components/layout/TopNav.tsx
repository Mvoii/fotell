"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useNavigation } from '@/hooks/useNavigation';
import { useLogout } from '@/hooks/useLogout';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { useTheme } from '@/contexts/ThemeContext';

interface TopNavProps {
  transparent?: boolean;
  showSearch?: boolean;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({
  transparent = false,
  showSearch = false,
  onMenuToggle,
  showMenuButton = false
}: TopNavProps) {
  const { data: user } = useUser();
  const { mobileMenuOpen, toggleMobileMenu } = useNavigation();
  const { logout, loading: logoutLoading } = useLogout();
  const { theme, toggleTheme } = useTheme();

  const handleMenuToggle = () => {
    if (onMenuToggle) {
      onMenuToggle();
    } else {
      toggleMobileMenu();
    }
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      transparent && "bg-transparent border-transparent"
    )}>
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side - Menu button and branding */}
        <div className="flex items-center gap-4">
          {showMenuButton && user && (
            <button
              onClick={handleMenuToggle}
              className="p-2 rounded-md hover:bg-muted transition-colors lg:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link href={user ? "/dashboard" : "/"} className="flex items-center hover:opacity-80 transition-opacity">
            {/* Full wordmark — used at all sizes */}
            <Image
              src="/logo1.svg"
              alt="FoTell"
              width={90}
              height={30}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center - Search (optional) */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <input
              type="search"
              placeholder="Search markets..."
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              aria-label="Search markets"
            />
          </div>
        )}

        {/* Right side - User actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle — always visible */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <>
              {/* Notifications - Only for authenticated users */}
              <NotificationDropdown />

              {/* User menu */}
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                  title="View profile"
                >
                  <div className="w-6 h-6 bg-accent-blue rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{user.username}</span>
                </Link>

                {/* Settings - Desktop only */}
                <Link
                  href="/settings"
                  className="hidden lg:flex p-2 rounded-md hover:bg-muted transition-colors"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>

                {/* Sign out - Desktop only */}
                <button
                  className="hidden lg:flex p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={logout}
                  disabled={logoutLoading}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            /* Unauthenticated - Auth buttons */
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-2 text-sm font-medium bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
