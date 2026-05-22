"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { useNavigation } from '@/hooks/useNavigation';

export default function DemoPage() {
  const { activeTab, sidebarCollapsed, toggleSidebar } = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  return (
    <AppShell
      isAuthenticated={isAuthenticated}
      topNavProps={{
        showSearch: true,
      }}
      bottomNavProps={{
        onTradePress: () => console.log('Trade pressed from demo'),
      }}
    >
      <PageContainer maxWidth="xl" inAppShell>
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Navigation System Demo</h1>
              <button
                onClick={() => setIsAuthenticated(!isAuthenticated)}
                className="px-3 py-1 text-sm bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md transition-colors"
              >
                {isAuthenticated ? 'Sign Out' : 'Sign In'}
              </button>
            </div>
            <p className="text-muted-foreground-foreground mb-4">
              This page demonstrates three-axis navigation system with responsive behavior and authentication states.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">Current State</h3>
                <ul className="space-y-1 text-sm">
                  <li>Active Tab: {activeTab || 'None'}</li>
                  <li>Sidebar Collapsed: {sidebarCollapsed ? 'Yes' : 'No'}</li>
                  <li>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</li>
                </ul>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">Navigation Features</h3>
                <ul className="space-y-1 text-sm">
                  <li>✅ Top Navbar (All pages)</li>
                  <li>{isAuthenticated ? '✅' : '❌'} Left Sidebar (Auth only)</li>
                  <li>{isAuthenticated ? '✅' : '❌'} Bottom Navigation (Auth only)</li>
                  <li>✅ Active state styling</li>
                </ul>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">Responsive Behavior</h3>
                <ul className="space-y-1 text-sm">
                  <li>📱 Mobile: Bottom nav</li>
                  <li>📱 Mobile: Hamburger menu</li>
                  <li>🖥️ Desktop: Left sidebar</li>
                  <li>🖥️ Desktop: Top search bar</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Authentication Testing</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Unauthenticated State</h3>
                <ul className="space-y-1 text-sm text-muted-foreground-foreground">
                  <li>• Top navbar visible</li>
                  <li>• Left sidebar hidden</li>
                  <li>• Bottom navigation hidden</li>
                  <li>• Login/Signup buttons in top nav</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Authenticated State</h3>
                <ul className="space-y-1 text-sm text-muted-foreground-foreground">
                  <li>• Top navbar visible</li>
                  <li>• Left sidebar visible (desktop)</li>
                  <li>• Bottom navigation visible (mobile)</li>
                  <li>• User profile in top nav</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-muted-foreground-foreground mt-4">
              Click the &quot;Sign In/Out&quot; button above to toggle authentication state and see how navigation adapts.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Test Instructions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Mobile Testing (&lt; 1024px)</h3>
                <ul className="space-y-1 text-sm text-muted-foreground-foreground">
                  <li>• Bottom navigation should be visible (auth only)</li>
                  <li>• Left sidebar should be hidden</li>
                  <li>• Hamburger menu should toggle mobile menu (auth only)</li>
                  <li>• Content should have bottom padding (auth only)</li>
                  <li>• Mobile menu should show all navigation items</li>
                  <li>• Click outside mobile menu to close</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Desktop Testing (≥ 1024px)</h3>
                <ul className="space-y-1 text-sm text-muted-foreground-foreground">
                  <li>• Left sidebar should be visible (auth only)</li>
                  <li>• Bottom navigation should be hidden</li>
                  <li>• Search bar should appear in top nav</li>
                  <li>• Sidebar should be collapsible (auth only)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Interactive Elements</h2>
            <div className="flex flex-wrap gap-4">
              {isAuthenticated && (
                <button
                  onClick={toggleSidebar}
                  className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md transition-colors"
                >
                  Toggle Sidebar
                </button>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground-foreground">
                <span>Resize your browser window to test responsive behavior</span>
              </div>
            </div>
          </div>

          {/* Demo content to show scrolling */}
          <div className="space-y-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Content Block {i + 1}</h3>
                <p className="text-muted-foreground-foreground">
                  This is demo content to test scrolling and layout behavior.
                  The navigation should remain fixed while content scrolls.
                  {isAuthenticated && ' Navigation elements are shown for authenticated users.'}
                  {!isAuthenticated && ' Only top navigation is shown for unauthenticated users.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
