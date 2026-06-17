"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { AdminMarketTable } from '@/components/admin/AdminMarketTable';
import { Button } from '@/components/ui/button';
import { useMarkets } from '@/hooks/useMarkets';
import { useCloseMarket, useOpenMarket, useResolveMarket } from '@/hooks/useAdmin';
import type { MarketStatus } from '@/lib/api/types/api';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { useUser } from '@/hooks/useUser';

const STATUS_OPTIONS: MarketStatus[] = ['PENDING', 'OPEN', 'CLOSED', 'RESOLVED'];

export default function AdminMarketsPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [status, setStatus] = useState<MarketStatus>('PENDING');
  const [offset, setOffset] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 50;

  const { data, isLoading, isError, error } = useMarkets({ status, limit, offset });
  const openMarketMutation = useOpenMarket();
  const closeMarketMutation = useCloseMarket();
  const resolveMarketMutation = useResolveMarket();

  const actionLoading =
    openMarketMutation.isPending || closeMarketMutation.isPending || resolveMarketMutation.isPending;

  const handleOpen = async (marketId: string) => {
    try {
      setActionError(null);
      await openMarketMutation.mutateAsync(marketId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to open market');
    }
  };

  const handleClose = async (marketId: string) => {
    try {
      setActionError(null);
      await closeMarketMutation.mutateAsync(marketId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to close market');
    }
  };

  const handleResolve = async (marketId: string, outcome: 'YES' | 'NO') => {
    try {
      setActionError(null);
      await resolveMarketMutation.mutateAsync({ marketId, outcome });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to resolve market');
    }
  };

  const hasNextPage = Boolean(data && offset + limit < data.total);

  return (
    <AuthGuard requireAdmin={true}>
      <AppShell isAuthenticated={!!user}>
        <PageContainer maxWidth="xl" inAppShell showBreadcrumbs={true}>
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            ← Back to Admin Dashboard
          </Button>

          <div className="mb-6">
            <h1 className="heading-xl text-primary mb-2">Market Management</h1>
            <p className="text-primary">Open, close, and resolve markets.</p>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="status-filter" className="text-sm text-primary">
              Status
            </label>
            <select
              id="status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as MarketStatus);
                setOffset(0);
              }}
              className="border border-subtle rounded-lg px-3 py-2 bg-surface text-primary"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {isError && (
            <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-md">
              <p className="text-error text-sm">Failed to load markets: {error?.message || 'Unknown error'}</p>
            </div>
          )}

          {actionError && (
            <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-md">
              <p className="text-error text-sm">{actionError}</p>
            </div>
          )}

          <AdminMarketTable
            markets={data?.markets || []}
            loading={isLoading}
            actionLoading={actionLoading}
            onOpen={handleOpen}
            onClose={handleClose}
            onResolve={handleResolve}
          />

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>
              Previous
            </Button>
            <Button variant="outline" onClick={() => setOffset(offset + limit)} disabled={!hasNextPage}>
              Next
            </Button>
          </div>
        </PageContainer>
      </AppShell>
    </AuthGuard>
  );
}
