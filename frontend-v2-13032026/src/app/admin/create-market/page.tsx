"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { CreateMarketWizard } from '@/components/admin/CreateMarketWizard';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { useUser } from '@/hooks/useUser';

export default function CreateMarketPage() {
  const router = useRouter();
  const { data: user } = useUser();

  const handleSuccess = (marketId: string) => {
    // Redirect to the created market or admin dashboard
    router.push(`/admin?created=${marketId}`);
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  return (
    <AuthGuard requireAdmin={true}>
      <AppShell isAuthenticated={!!user}>
        <PageContainer maxWidth="lg" inAppShell>
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="text-primary hover:text-primary-hover mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Dashboard
            </button>
            <h1 className="heading-xl text-primary mb-2">Create New Market</h1>
            <p className="text-primary">Create a new prediction market with custom parameters</p>
          </div>

          <div className="bg-surface border border-subtle rounded-lg p-6">
            <CreateMarketWizard
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </PageContainer>
      </AppShell>
    </AuthGuard>
  );
}
