"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useUserTrades } from '@/hooks/useTrade';
import { formatTimeAgo } from '@/lib/utils';
import { MarketName } from '@/components/dashboard/MarketName';
import { cn } from '@/lib/utils';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load last seen from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('fotell_notif_last_seen');
      setLastSeen(val || new Date(0).toISOString());
    }
  }, []);

  const { data: tradesData } = useUserTrades(10, 0);
  const trades = tradesData?.trades ?? [];

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      const now = new Date().toISOString();
      localStorage.setItem('fotell_notif_last_seen', now);
      setLastSeen(now);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // A trade is unread if its created_at timestamp is newer than lastSeen
  const hasNew = !!(
    lastSeen &&
    trades.length > 0 &&
    trades.some((t) => new Date(t.created_at).getTime() > new Date(lastSeen).getTime())
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        className="p-2 rounded-md hover:bg-muted transition-colors relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {hasNew && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-subtle rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-subtle flex justify-between items-center bg-elevated">
            <span className="font-semibold text-sm text-primary">Notifications</span>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto divide-y divide-subtle">
            {trades.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No recent activity
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="p-3 text-xs text-primary hover:bg-muted/50 transition-colors"
                >
                  <div className="mb-1 leading-relaxed">
                    <span
                      className={cn(
                        "font-bold mr-1",
                        trade.outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
                      )}
                    >
                      {trade.outcome}
                    </span>
                    {trade.shares} shares in &apos;
                    <MarketName marketId={trade.market_id} />
                    &apos;
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatTimeAgo(trade.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-subtle text-center bg-elevated">
            <Link
              href="/portfolio"
              onClick={() => setIsOpen(false)}
              className="text-xs text-accent-blue hover:text-accent-blue-hover font-medium block w-full py-1"
            >
              View all activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
