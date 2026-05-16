import React, { useState } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { Market } from '@/lib/api/types/api';
import { ResolveMarketModal } from './ResolveMarketModal';

export function AdminMarketTable() {
  const { data, isLoading, error } = useMarkets();
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  if (isLoading) return <div className="text-primary py-4">Loading markets...</div>;
  if (error) return <div className="text-danger py-4">Error loading markets.</div>;

  const markets = data?.markets || [];
  // Only show OPEN or CLOSED markets for resolution, or maybe all
  const resolvableMarkets = markets.filter(m => m.status === 'OPEN' || m.status === 'CLOSED');

  return (
    <div className="mt-8">
      <h2 className="heading-lg text-primary mb-4">Manage Markets</h2>
      <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
        {resolvableMarkets.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No markets available to manage.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle bg-base">
                  <th className="p-4 font-semibold text-primary">Question</th>
                  <th className="p-4 font-semibold text-primary">Status</th>
                  <th className="p-4 font-semibold text-primary text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resolvableMarkets.map((market) => (
                  <tr key={market.id} className="border-b border-subtle hover:bg-base/50 transition-colors">
                    <td className="p-4 text-primary">{market.question}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${market.status === 'OPEN'
                          ? 'bg-accent-blue/10 text-accent-blue'
                          : 'bg-muted/10 text-muted-foreground'
                        }`}>
                        {market.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedMarket(market)}
                        className="px-4 py-1.5 bg-danger/10 text-danger text-sm font-semibold rounded hover:bg-danger/20 transition-colors"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedMarket && (
        <ResolveMarketModal
          market={selectedMarket}
          isOpen={!!selectedMarket}
          onClose={() => setSelectedMarket(null)}
        />
      )}
    </div>
  );
}
