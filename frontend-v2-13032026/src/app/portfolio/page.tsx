"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { PositionsList } from '@/components/dashboard/PositionsList';
import { TradesList } from '@/components/dashboard/TradesList';
import { useUser } from '@/hooks/useUser';
import { cn } from '@/lib/utils';
import { User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'positions' | 'activity' | 'account';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: user, isLoading } = useUser();
  const router = useRouter();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'positions', label: 'Positions' },
    { id: 'activity', label: 'Activity' },
    { id: 'account', label: 'Account' },
  ];

  return (
    <AppShell isAuthenticated={!!user}>
      <PageContainer maxWidth="xl" inAppShell>
        <div className="mb-6">
          <h1 className="heading-xl text-primary mb-2">Portfolio</h1>
          <p className="text-primary">
            Manage your investments and account details
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
                  : "border-transparent text-secondary hover:text-primary hover:border-subtle"
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
              <PortfolioSummary />
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

          {activeTab === 'account' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
              <div className="bg-surface border border-subtle rounded-lg p-6 mb-6">
                <h3 className="heading-lg text-primary mb-6 flex items-center gap-2">
                  <User className="h-5 w-5" /> Account Information
                </h3>
                
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-elevated rounded w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-elevated rounded w-1/2 animate-pulse"></div>
                    <div className="h-4 bg-elevated rounded w-1/4 animate-pulse"></div>
                  </div>
                ) : user ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wide mb-1">Username</div>
                      <div className="text-primary font-medium">{user.username}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wide mb-1">Email</div>
                      <div className="text-primary">{user.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wide mb-1">Full Name</div>
                      <div className="text-primary">{user.full_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wide mb-1">Role</div>
                      <div className="inline-block px-2 py-1 bg-elevated rounded text-xs font-medium text-primary">
                        {user.role}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wide mb-1">Joined</div>
                      <div className="text-primary">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-secondary text-sm">Unable to load profile data</div>
                )}
              </div>
              
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <h3 className="heading-lg text-primary mb-4">Security & Actions</h3>
                <button 
                  onClick={() => router.push('/')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
