"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { AppShell } from '@/components/layout/AppShell';

/**
 * /dashboard — admin-only landing page.
 *
 * Regular users are redirected to /portfolio (their primary hub).
 * Admin users are redirected to /admin (system & market management).
 *
 * This page acts as an intelligent router rather than rendering content
 * directly, keeping the UX clean and role-appropriate.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role === 'ADMIN') {
      router.replace('/admin');
    } else {
      router.replace('/portfolio');
    }
  }, [user, isLoading, router]);

  // Show a brief loading state while we determine the destination
  return (
    <AppShell isAuthenticated={!!user}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-secondary text-sm">Redirecting…</p>
        </div>
      </div>
    </AppShell>
  );
}
