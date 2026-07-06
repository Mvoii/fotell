"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  CircleUser,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  requireAuth?: boolean;
}

export function BottomNav() {
  const { data: user } = useUser();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: 'markets',
      label: 'Markets',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/markets',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <CircleUser className="h-5 w-5" />,
      href: '/profile',
      requireAuth: true,
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: <User className="h-5 w-5" />,
      href: '/portfolio',
      requireAuth: true,
    },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.requireAuth && !user) return false;
    return true;
  });

  const isActive = (item: NavItem) => {
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {/* Oracle O brand mark — center anchor */}
        <Link
          href={user ? '/dashboard' : '/'}
          className="flex flex-col items-center justify-center gap-1 px-3 py-1 opacity-90 hover:opacity-100 transition-opacity"
          aria-label="FoTell home"
        >
          <Image
            src="/logo2.svg"
            alt="FoTell"
            width={28}
            height={28}
            className="object-contain"
            priority
          />
        </Link>

        {/* Primary nav items */}
        {filteredNavItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-1 w-full transition-colors relative",
                active
                  ? "text-accent-blue"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className="relative">
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
              {active && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-blue rounded-full"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
