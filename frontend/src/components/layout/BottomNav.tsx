"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/store/ui";
import {
  HomeIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  EyeIcon as EyeIconSolid,
  UserIcon as UserIconSolid,
} from "@heroicons/react/24/solid";

interface Tab {
  key: "home" | "markets" | "trade" | "watchlist" | "portfolio";
  label: string;
  href?: string;
  Icon: React.ComponentType<{ className?: string }>;
  IconActive: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  {
    key: "home",
    label: "Home",
    href: "/home",
    Icon: HomeIcon,
    IconActive: HomeIconSolid,
  },
  {
    key: "markets",
    label: "Markets",
    href: "/markets",
    Icon: ChartBarIcon,
    IconActive: ChartBarIconSolid,
  },
  {
    key: "trade",
    label: "Trade",
    Icon: ArrowsRightLeftIcon,
    IconActive: ArrowsRightLeftIcon,
  },
  {
    key: "watchlist",
    label: "Watchlist",
    href: "/watchlist",
    Icon: EyeIcon,
    IconActive: EyeIconSolid,
  },
  {
    key: "portfolio",
    label: "Portfolio",
    href: "/portfolio",
    Icon: UserIcon,
    IconActive: UserIconSolid,
  },
];

interface BottomNavProps {
  pendingOrdersCount?: number;
  unreadAlertsCount?: number;
}

export default function BottomNav({
  pendingOrdersCount = 0,
  unreadAlertsCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();
  const { openTradeSheet } = useUIStore();

  function isActive(tab: Tab): boolean {
    if (tab.key === "trade") return false;
    return pathname.startsWith(tab.href ?? "/__never");
  }

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        h-[56px] bg-bg-surface border-t border-border-subtle
        flex items-stretch
        lg:hidden
        pb-[env(safe-area-inset-bottom,0px)]
      "
      aria-label="Main navigation"
    >
      {TABS.map((tab) => {
        const active = isActive(tab);
        const Icon = active ? tab.IconActive : tab.Icon;
        const colorClass = active
          ? "text-accent-blue"
          : "text-text-secondary hover:text-text-primary";

        const inner = (
          <>
            <div className="relative">
              <Icon className="w-6 h-6" />
              {/* Notification badge — Home tab */}
              {tab.key === "home" && unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                </span>
              )}
              {/* Notification badge — Portfolio tab */}
              {tab.key === "portfolio" && pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-warning text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium mt-0.5 leading-none">
              {tab.label}
            </span>
            {/* Active dot indicator */}
            {active && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent-blue" />
            )}
          </>
        );

        const baseClass = `
          relative flex flex-col items-center justify-center flex-1 gap-0.5
          transition-colors duration-150 select-none
          ${colorClass}
        `;

        if (tab.key === "trade") {
          return (
            <button
              key={tab.key}
              onClick={openTradeSheet}
              className={baseClass}
              aria-label="Open trade sheet"
            >
              {inner}
            </button>
          );
        }

        return (
          <Link
            key={tab.key}
            href={tab.href!}
            className={baseClass}
            aria-current={active ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
