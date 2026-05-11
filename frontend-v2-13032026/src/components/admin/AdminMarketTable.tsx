"use client";

import React from 'react';
import type { Market } from '@/lib/api/types/api';
import { Button } from '@/components/ui/button';

interface AdminMarketTableProps {
  markets: Market[];
  loading: boolean;
  actionLoading?: boolean;
  onOpen: (marketId: string) => void;
  onClose: (marketId: string) => void;
  onResolve: (marketId: string, outcome: 'YES' | 'NO') => void;
}

export function AdminMarketTable({
  markets,
  loading,
  actionLoading = false,
  onOpen,
  onClose,
  onResolve,
}: AdminMarketTableProps) {
  if (loading) {
    return (
      <div className="bg-surface border border-subtle rounded-lg p-6">
        <div className="space-y-3">
          {['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4', 'skeleton-5'].map((key) => (
            <div key={key} className="animate-pulse">
              <div className="h-10 bg-elevated rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="bg-surface border border-subtle rounded-lg p-6 text-center text-primary">
        No markets found.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-lg p-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-subtle">
            <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">Question</th>
            <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">Status</th>
            <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">Closes</th>
            <th className="text-left py-3 px-2 text-xs text-primary uppercase tracking-wide">Resolution</th>
            <th className="text-right py-3 px-2 text-xs text-primary uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => (
            <tr key={market.id} className="border-b border-subtle last:border-b-0">
              <td className="py-3 px-2 text-primary max-w-[360px]">
                <div className="truncate" title={market.question}>
                  {market.question}
                </div>
              </td>
              <td className="py-3 px-2 text-primary">{market.status}</td>
              <td className="py-3 px-2 text-primary">
                {new Date(market.closes_at).toLocaleString('en-KE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </td>
              <td className="py-3 px-2 text-primary">{market.resolved_outcome || '-'}</td>
              <td className="py-3 px-2">
                <div className="flex justify-end gap-2">
                  {market.status === 'PENDING' && (
                    <Button size="sm" onClick={() => onOpen(market.id)} disabled={actionLoading}>
                      Open
                    </Button>
                  )}

                  {market.status === 'OPEN' && (
                    <Button size="sm" variant="outline" onClick={() => onClose(market.id)} disabled={actionLoading}>
                      Close
                    </Button>
                  )}

                  {market.status === 'CLOSED' && (
                    <>
                      <Button size="sm" onClick={() => onResolve(market.id, 'YES')} disabled={actionLoading}>
                        Resolve YES
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onResolve(market.id, 'NO')}
                        disabled={actionLoading}
                      >
                        Resolve NO
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
