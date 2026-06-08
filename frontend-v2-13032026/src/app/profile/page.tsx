"use client";

import React from 'react';
import { useUser } from '@/hooks/useUser';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { AppShell } from '@/components/layout/AppShell';
import { useLogout } from '@/hooks/useLogout';
import { LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { data: user, isLoading, error } = useUser();
  const { logout, loading: isLoggingOut } = useLogout();

  return (
    <AppShell
      isAuthenticated={!!user}
      topNavProps={{ showSearch: false }}
    >
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="heading-xl text-primary mb-1">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your account information and preferences
          </p>
        </div>

        <ClientOnly fallback={
          <div className="space-y-6">
            <div className="bg-surface border border-subtle rounded-lg p-6 animate-pulse space-y-4">
              <div className="h-8 bg-elevated rounded w-32" />
              <div className="h-32 bg-elevated rounded" />
            </div>
            <div className="bg-surface border border-subtle rounded-lg p-6 animate-pulse space-y-4">
              <div className="h-16 bg-elevated rounded" />
              <div className="h-16 bg-elevated rounded" />
            </div>
          </div>
        }>
          {error ? (
            <div className="text-error">Unable to load profile information</div>
          ) : (
            <div className="space-y-6">
              {/* Account Information */}
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <h2 className="heading-lg text-primary mb-4">Account Information</h2>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-elevated rounded" />
                    <div className="h-24 bg-elevated rounded" />
                  </div>
                ) : user ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</label>
                        <p className="text-primary font-medium mt-1">{user.full_name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Username</label>
                        <p className="text-primary font-mono tabular-nums mt-1">@{user.username}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Email</label>
                        <p className="text-primary font-mono tabular-nums mt-1">{user.email}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Account Type</label>
                        <p className="mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-warning/20 text-warning'
                              : 'bg-accent-blue/20 text-accent-blue'
                          }`}>
                            {user.role}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-subtle">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</label>
                        <p className="text-primary font-mono tabular-nums mt-1">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Account Status</label>
                        <p className="mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.is_active
                              ? 'bg-success/20 text-success'
                              : 'bg-error/20 text-error'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {user.last_login_at && (
                      <div className="pt-4 border-t border-subtle">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</label>
                        <p className="text-primary font-mono tabular-nums mt-1">
                          {new Date(user.last_login_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Preferences */}
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <h2 className="heading-lg text-primary mb-4">Preferences</h2>
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3 border-b border-subtle">
                    <div>
                      <h3 className="text-sm font-medium text-primary">Email Notifications</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Receive updates about your trades and market resolutions</p>
                    </div>
                    <button className="text-muted-foreground hover:text-primary transition-colors" aria-label="Configure email notifications">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-subtle">
                    <div>
                      <h3 className="text-sm font-medium text-primary">Security</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Manage your password and authentication settings</p>
                    </div>
                    <button className="text-muted-foreground hover:text-primary transition-colors" aria-label="Configure security settings">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="text-sm font-medium text-primary">Privacy</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Control your data and privacy preferences</p>
                    </div>
                    <button className="text-muted-foreground hover:text-primary transition-colors" aria-label="Configure privacy settings">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone / Sign Out */}
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <h2 className="heading-lg text-primary mb-4">Session</h2>
                <button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 text-sm text-error hover:text-error/80 transition-colors disabled:opacity-50"
                  id="profile-sign-out-btn"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </ClientOnly>
      </div>
    </AppShell>
  );
}
