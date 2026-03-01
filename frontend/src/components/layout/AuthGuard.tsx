"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, also requires user.role === 'ADMIN' */
  requireAdmin?: boolean;
  /** Rendered while auth state is loading (future: add isHydrating) */
  fallback?: React.ReactNode;
}

/**
 * Client-side auth guard.
 * Redirects to /auth/login?next={currentPath} if not authenticated.
 * Redirects to /home if authenticated but not admin (when requireAdmin).
 *
 * Note: Next.js middleware.ts handles the server-side redirect for
 * hard navigations. This component covers client-side transitions.
 */
export default function AuthGuard({
  children,
  requireAdmin = false,
  fallback = null,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isAdmin } = useAuthStore();

  useEffect(() => {
    const authed = isAuthenticated();

    if (!authed) {
      const next = encodeURIComponent(pathname);
      router.replace(`/auth/login?next=${next}`);
      return;
    }

    if (requireAdmin && !isAdmin()) {
      router.replace("/home");
    }
  }, [isAuthenticated, isAdmin, requireAdmin, pathname, router]);

  // While redirect is in-flight, render the fallback (skeleton / null)
  const authed = isAuthenticated();
  if (!authed) return <>{fallback}</>;
  if (requireAdmin && !isAdmin()) return <>{fallback}</>;

  return <>{children}</>;
}
