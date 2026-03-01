/**
 * App Shell layout — wraps every authenticated route.
 * Provides BottomNav (mobile) + LeftRail (desktop).
 *
 * Routes that opt into this shell:
 *   /home, /markets, /markets/[id], /watchlist, /portfolio, /settings, /notifications
 *
 * The landing page (/) and auth pages (/auth/*) use their own minimal layouts.
 */
import BottomNav from "@/components/layout/BottomNav";
import LeftRail from "@/components/layout/LeftRail";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Desktop: fixed left rail */}
      <LeftRail />

      {/* Page content */}
      {children}

      {/* Mobile: fixed bottom nav */}
      <BottomNav />
    </>
  );
}
