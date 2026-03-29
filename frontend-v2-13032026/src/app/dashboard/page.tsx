"use client";

import React from 'react';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { PositionsList } from '@/components/dashboard/PositionsList';
import { TradesList } from '@/components/dashboard/TradesList';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { useNavigation } from '@/hooks/useNavigation';
import { useUser } from '@/hooks/useUser';

export default function DashboardPage() {
  const { activeTab } = useNavigation();
  const { data: user } = useUser();

  return (
    <AppShell
      isAuthenticated={!!user}
      topNavProps={{
        showSearch: false,
      }}
      bottomNavProps={{
        // activeTab: 'home',
      }}
    >
      <PageContainer maxWidth="7xl" inAppShell>
        <div className="mb-8">
          <h1 className="heading-xl text-primary mb-2">Dashboard</h1>
          <p className="text-primary">
            Manage your portfolio and track your trading activity
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <DashboardStats />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card - Takes 1 column on desktop */}
          <div className="lg:col-span-1">
            <BalanceCard />
          </div>

          {/* Positions and Trades - Take 2 columns on desktop */}
          <div className="lg:col-span-2 space-y-6">
            <PositionsList />
            <TradesList />
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 bg-surface border border-subtle rounded-lg p-6">
          <h2 className="heading-lg text-primary mb-4">Portfolio Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="heading-md text-primary mb-3">Getting Started</h3>
              <ul className="space-y-2 text-sm text-primary">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Browse markets to find prediction opportunities
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Buy YES or NO shares based on your predictions
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Monitor your positions and track performance
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Collect payouts when markets resolve
                </li>
              </ul>
            </div>
            <div>
              <h3 className="heading-md text-primary mb-3">Account Features</h3>
              <ul className="space-y-2 text-sm text-primary">
                <li className="flex items-start">
                  <span className="text-success mr-2">✓</span>
                  Real-time balance tracking
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  Position tracking (coming soon)
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  Trade history (coming soon)
                </li>
                <li className="flex items-start">
                  <span className="text-warning mr-2">⚠</span>
                  Advanced analytics (coming soon)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
