"use client";

import React from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin={true}>
      <AppShell
        topNavProps={{
          showSearch: false,
        }}
      >
        <PageContainer maxWidth="7xl" inAppShell>
          <div className="mb-8">
            <h1 className="heading-xl text-primary mb-2">Admin Dashboard</h1>
            <p className="text-primary">Manage prediction markets and system settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Market Creation */}
            <Link 
              href="/admin/create-market"
              className="block bg-surface border border-subtle rounded-lg p-6 hover:border-accent-blue transition-colors"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="heading-lg text-primary">Create Market</h3>
              </div>
              <p className="text-primary text-sm">
                Create a new prediction market with custom parameters
              </p>
            </Link>

            {/* Market Management */}
            <Link 
              href="/admin/markets"
              className="block bg-surface border border-subtle rounded-lg p-6 hover:border-accent-blue transition-colors"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="heading-lg text-primary">Manage Markets</h3>
              </div>
              <p className="text-primary text-sm">
                Open, close, and resolve existing markets
              </p>
            </Link>

            {/* User Management */}
            <div className="bg-surface border border-subtle rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="heading-lg text-primary">User Management</h3>
              </div>
              <p className="text-primary text-sm">
                Manage user accounts and permissions (Coming soon)
              </p>
            </div>

            {/* System Settings */}
            <div className="bg-surface border border-subtle rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="heading-lg text-primary">System Settings</h3>
              </div>
              <p className="text-primary text-sm">
                Configure system parameters and settings (Coming soon)
              </p>
            </div>

            {/* Analytics */}
            <div className="bg-surface border border-subtle rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="heading-lg text-primary">Analytics</h3>
              </div>
              <p className="text-primary text-sm">
                View system analytics and reports (Coming soon)
              </p>
            </div>

            {/* Audit Logs */}
            <div className="bg-surface border border-subtle rounded-lg p-6 opacity-60">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="heading-lg text-primary">Audit Logs</h3>
              </div>
              <p className="text-primary text-sm">
                View system activity and audit logs (Coming soon)
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8">
            <h2 className="heading-lg text-primary mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-subtle rounded-lg p-4">
                <h3 className="text-sm text-primary mb-1">Total Markets</h3>
                <p className="heading-xl text-primary">--</p>
              </div>
              <div className="bg-surface border border-subtle rounded-lg p-4">
                <h3 className="text-sm text-primary mb-1">Active Markets</h3>
                <p className="heading-xl text-primary">--</p>
              </div>
              <div className="bg-surface border border-subtle rounded-lg p-4">
                <h3 className="text-sm text-primary mb-1">Total Users</h3>
                <p className="heading-xl text-primary">--</p>
              </div>
              <div className="bg-surface border border-subtle rounded-lg p-4">
                <h3 className="text-sm text-primary mb-1">24h Volume</h3>
                <p className="heading-xl text-primary">--</p>
              </div>
            </div>
          </div>
        </PageContainer>
      </AppShell>
    </AuthGuard>
  );
}
