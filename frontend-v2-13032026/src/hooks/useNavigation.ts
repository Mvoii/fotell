"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type NavigationTab = 'dashboard' | 'markets' | 'trade' | 'watchlist' | 'profile';

export interface NavigationState {
  activeTab: NavigationTab | null;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
}

export interface NavigationActions {
  setActiveTab: (tab: NavigationTab | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  navigateToTab: (tab: NavigationTab) => void;
  openTradeSheet: () => void;
}

const tabRoutes: Record<NavigationTab, string> = {
  dashboard: '/dashboard',
  markets: '/markets',
  trade: '#trade', // Special case for Global Trade Sheet
  watchlist: '#watchlist',
  profile: '/profile',
};

const SIDEBAR_COLLAPSED_KEY = 'fotell:sidebar-collapsed';

function getCurrentTabFromPath(path: string): NavigationTab | null {
  if (path === '/dashboard') return 'dashboard';
  if (path.startsWith('/markets')) return 'markets';
  if (path === '#watchlist') return 'watchlist';
  if (path === '/profile') return 'profile';
  return null;
}

export function useNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Initialize sidebar state from localStorage
  const getInitialSidebarState = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  }, []);

  const [state, setState] = useState<NavigationState>({
    activeTab: getCurrentTabFromPath(pathname),
    sidebarCollapsed: getInitialSidebarState(),
    mobileMenuOpen: false,
  });

  // Persist sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(state.sidebarCollapsed));
      } catch {
        // Ignore localStorage errors (e.g., private browsing mode)
      }
    }
  }, [state.sidebarCollapsed]);

  const setActiveTab = useCallback((tab: NavigationTab | null) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, [setState]);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }));
  }, []);

  const setMobileMenuOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, mobileMenuOpen: open }));
  }, []);

  const openTradeSheet = useCallback(() => {
    // TODO: Implement Global Trade Sheet opening logic
    console.log('Opening Global Trade Sheet');
    // This could dispatch a state update, open a modal, etc.
    setActiveTab('trade');
  }, [setActiveTab]);

  const navigateToTab = useCallback((tab: NavigationTab) => {
    const route = tabRoutes[tab];
    if (route.startsWith('#')) {
      // Special handling for trade tab
      openTradeSheet();
    } else {
      router.push(route);
    }
    setActiveTab(tab);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  }, [router, setActiveTab, setMobileMenuOpen, openTradeSheet]);

  // Update active tab when pathname changes
  React.useEffect(() => {
    const currentTab = getCurrentTabFromPath(pathname);
    setActiveTab(currentTab);
  }, [pathname, setActiveTab]);

  const actions: NavigationActions = {
    setActiveTab,
    toggleSidebar,
    setSidebarCollapsed,
    toggleMobileMenu,
    setMobileMenuOpen,
    navigateToTab,
    openTradeSheet,
  };

  return {
    ...state,
    ...actions,
    tabRoutes,
  };
}
