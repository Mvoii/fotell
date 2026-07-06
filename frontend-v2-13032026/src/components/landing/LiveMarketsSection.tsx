"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Market {
  id: string;
  question: string;
  status: string;
  yes_price: number | null;
  no_price: number | null;
  liquidity_param: number;
  closes_at: string;
}

interface MarketsResponse {
  markets: Market[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function formatPct(price: number | null): string {
  if (price === null) return "—";
  return `${Math.round(price)}%`;
}

function pct(price: number | null): number {
  if (price === null) return 50;
  return Math.min(100, Math.max(0, Math.round(price)));
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="min-w-[85vw] md:min-w-0 snap-center bg-surface border border-subtle rounded-2xl p-6 shadow-sm mr-4 md:mr-0 flex flex-col animate-pulse">
      <div className="h-4 w-16 bg-elevated rounded mb-4" />
      <div className="h-5 w-full bg-elevated rounded mb-2" />
      <div className="h-5 w-3/4 bg-elevated rounded mb-6" />
      <div className="space-y-3 mb-6">
        <div className="h-2 w-full bg-elevated rounded-full" />
        <div className="h-2 w-full bg-elevated rounded-full" />
      </div>
      <div className="flex justify-between mt-auto pt-4 border-t border-subtle">
        <div className="h-4 w-20 bg-elevated rounded" />
        <div className="h-4 w-16 bg-elevated rounded" />
      </div>
    </div>
  );
}

// ─── Market card ──────────────────────────────────────────────────────────────

function MarketCard({ market }: { market: Market }) {
  const yesP = pct(market.yes_price);
  const noP = pct(market.no_price);

  return (
    <div className="min-w-[85vw] md:min-w-0 snap-center bg-surface border border-subtle rounded-2xl p-6 shadow-sm mr-4 md:mr-0 flex flex-col hover:border-accent-blue/40 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold px-2 py-1 bg-yes-dim text-yes-strong rounded">
          {market.status}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-6 line-clamp-2 flex-grow">
        {market.question}
      </h3>

      <div className="space-y-3 mb-6">
        {/* YES bar */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-yes-strong w-8">YES</span>
          <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-yes-strong transition-all duration-500"
              style={{ width: `${yesP}%` }}
            />
          </div>
          <span className="font-medium w-8 text-right">{formatPct(market.yes_price)}</span>
        </div>
        {/* NO bar */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-no-strong w-8">NO</span>
          <div className="flex-1 mx-3 h-2 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-no-strong transition-all duration-500"
              style={{ width: `${noP}%` }}
            />
          </div>
          <span className="font-medium w-8 text-right">{formatPct(market.no_price)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-subtle">
        <span className="text-sm text-muted-foreground">
          Liq: {market.liquidity_param}
        </span>
        <Link
          href={`/markets/${market.id}`}
          className="text-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors"
        >
          Trade Now
        </Link>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function LiveMarketsSection() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchMarkets() {
      try {
        const res = await fetch(
          `${API_BASE}/markets?status=OPEN&limit=6`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MarketsResponse = await res.json();
        if (!cancelled) {
          setMarkets(data.markets ?? []);
          setTotal(data.total ?? data.markets?.length ?? 0);
          // Patch the stats strip market count in the hero section
          const el = document.getElementById("stat-markets");
          if (el && data.total != null) {
            el.textContent = String(data.total);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMarkets();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-20 bg-base">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold">
            Featured Markets
            {total !== null && (
              <span className="ml-3 text-base font-normal text-muted-foreground">
                ({total} open)
              </span>
            )}
          </h2>
          <Link
            href="/markets"
            className="text-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors hidden md:block"
          >
            View all →
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 md:px-0 md:mx-0">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">⚠️</p>
            <p className="font-semibold mb-1">Could not load live markets</p>
            <p className="text-sm">The API may be temporarily unavailable. Try refreshing in a moment.</p>
            <Link
              href="/markets"
              className="inline-block mt-4 text-sm font-semibold text-accent-blue hover:text-accent-blue-hover"
            >
              Browse all markets →
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && markets.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">🔮</p>
            <p className="font-semibold mb-1">No open markets yet</p>
            <p className="text-sm">Check back soon — new markets are added regularly.</p>
          </div>
        )}

        {/* Markets grid */}
        {!loading && !error && markets.length > 0 && (
          <div className="flex overflow-x-auto pb-8 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 md:px-0 md:mx-0">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}

        {/* Mobile "view all" */}
        <div className="mt-6 text-center md:hidden">
          <Link
            href="/markets"
            className="text-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors"
          >
            View all markets →
          </Link>
        </div>
      </div>
    </section>
  );
}
