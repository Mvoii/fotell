"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { PositionsList } from '@/components/dashboard/PositionsList';
import { TradesList } from '@/components/dashboard/TradesList';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'positions' | 'activity';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: user } = useUser();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'positions', label: 'Positions' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <AppShell isAuthenticated={!!user}>
      <PageContainer maxWidth="xl" inAppShell>
        <div className="mb-6">
          <h1 className="heading-xl text-primary mb-1">Portfolio</h1>
          <p className="text-muted-foreground text-sm">
            Your balance, positions, and trade activity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-subtle mb-6 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-accent-blue text-accent-blue"
                  : "border-transparent text-muted-foreground hover:text-primary hover:border-subtle"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Balance prominently at top */}
              <BalanceCard />
              {/* Aggregate portfolio stats */}
              <PortfolioSummary />
              {/* Quick glance at positions and recent trades */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PositionsList />
                <TradesList />
              </div>
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <PositionsList />
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TradesList />
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
