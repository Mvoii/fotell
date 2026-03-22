"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  UserIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  EyeIcon as EyeIconSolid,
  UserIcon as UserIconSolid,
} from "@heroicons/react/24/solid";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";

interface NavItem {
  key: string;
  label: string;
  href?: string;
  isTrade?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  IconActive: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { key: "home",      label: "Home",      href: "/home",      Icon: HomeIcon,      IconActive: HomeIconSolid },
  { key: "markets",   label: "Markets",   href: "/markets",   Icon: ChartBarIcon,  IconActive: ChartBarIconSolid },
  { key: "trade",     label: "Trade",     isTrade: true,      Icon: ArrowsRightLeftIcon, IconActive: ArrowsRightLeftIcon },
  { key: "watchlist", label: "Watchlist", href: "/watchlist", Icon: EyeIcon,       IconActive: EyeIconSolid },
  { key: "portfolio", label: "Portfolio", href: "/portfolio", Icon: UserIcon,      IconActive: UserIconSolid },
];

const SECONDARY_NAV: NavItem[] = [
  { key: "settings",  label: "Settings",  href: "/settings",  Icon: Cog6ToothIcon,             IconActive: Cog6ToothIcon },
  { key: "admin",     label: "Admin",     href: "/admin",     Icon: ShieldCheckIcon,            IconActive: ShieldCheckIcon, adminOnly: true },
];

interface LeftRailProps {
  /** Show expanded labels. If undefined, expansion is handled by CSS hover. */
  forceExpanded?: boolean;
}

export default function LeftRail({ forceExpanded }: LeftRailProps) {
  const pathname = usePathname();
  const { openTradeSheet } = useUIStore();
  const { isAdmin } = useAuthStore();

  function isActive(href?: string): boolean {
    if (!href) return false;
    return pathname.startsWith(href);
  }

  const itemClass = (active: boolean) => `
    group relative flex items-center gap-3
    px-4 py-3 rounded-lg cursor-pointer select-none
    transition-colors duration-150
    ${active
      ? "bg-accent-blue-dim text-primary"
      : "text-text-primary hover:bg-bg-elevated hover:text-text-primary"
    }
  `;

  const labelClass = `
    whitespace-nowrap overflow-hidden
    text-body-md font-medium
    transition-all duration-200
    ${forceExpanded
      ? "opacity-100 max-w-[140px]"
      : "opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px]"
    }
  `;

  return (
    <aside
      className={`
        hidden lg:flex flex-col
        fixed left-0 top-0 bottom-0 z-40
        bg-bg-surface border-r border-border-subtle
        transition-all duration-200
        overflow-hidden
        ${forceExpanded ? "w-[220px]" : "w-[64px] hover:w-[220px]"}
      `}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <Link
        href="/home"
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        aria-label="FoTell home"
      >
        <span className="text-2xl shrink-0">🔮</span>
        <span
          className={`
            font-bold text-text-primary text-heading-lg
            whitespace-nowrap overflow-hidden transition-all duration-200
            ${forceExpanded ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px]"}
          `}
        >
          FoTell
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col gap-1 px-2 flex-1" aria-label="Primary">
        {PRIMARY_NAV.map((item) => {
          const active = item.isTrade ? false : isActive(item.href);
          const Icon = active ? item.IconActive : item.Icon;

          if (item.isTrade) {
            return (
              <button
                key={item.key}
                onClick={openTradeSheet}
                className={itemClass(false)}
                aria-label="Open trade sheet"
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={labelClass}>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href!}
              className={itemClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={labelClass}>{item.label}</span>
              {active && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-accent-blue" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Secondary nav (bottom) */}
      <nav className="flex flex-col gap-1 px-2 pb-4 border-t border-border-subtle pt-3" aria-label="Secondary">
        {SECONDARY_NAV.filter(
          (item) => !item.adminOnly || isAdmin()
        ).map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.IconActive : item.Icon;
          return (
            <Link
              key={item.key}
              href={item.href!}
              className={itemClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </Link>
          );
        })}

        {/* Sign Out */}
        <button
          className={itemClass(false) + " w-full text-left"}
          onClick={() => {
            // Handled by the auth flow — POST /auth/logout
            if (typeof window !== "undefined") {
              const { clearAuth } = useAuthStore.getState();
              clearAuth();
              window.location.href = "/";
            }
          }}
          aria-label="Sign out"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
          <span className={labelClass}>Sign Out</span>
        </button>
      </nav>
    </aside>
  );
}
