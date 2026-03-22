"use client";

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { ClientOnly } from '@/components/ui/ClientOnly';

export default function ProfilePage() {
  const { data: user, isLoading, error } = useUser();

  return (
    <div className="min-h-screen bg-base">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="heading-xl text-primary mb-2">
            Profile
          </h1>
          <p className="text-primary">
            Manage your account settings and view your information
          </p>
        </div>

        <ClientOnly fallback={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-elevated rounded w-32"></div>
                  <div className="h-32 bg-elevated rounded"></div>
                  <div className="h-24 bg-elevated rounded"></div>
                </div>
              </div>
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-elevated rounded"></div>
                  <div className="h-16 bg-elevated rounded"></div>
                  <div className="h-16 bg-elevated rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-elevated rounded w-32"></div>
                  <div className="h-8 bg-elevated rounded w-24"></div>
                </div>
              </div>
              <div className="bg-surface border border-subtle rounded-lg p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-elevated rounded w-32"></div>
                  <div className="h-10 bg-elevated rounded"></div>
                  <div className="h-10 bg-elevated rounded"></div>
                </div>
              </div>
            </div>
          </div>
        }>
          {error ? (
            <div className="text-error">
              Unable to load profile information
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* User Info Card */}
                <div className="bg-surface border border-subtle rounded-lg p-6">
                  <h2 className="heading-lg text-primary mb-4">Account Information</h2>
                  {isLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-32 bg-elevated rounded"></div>
                      <div className="h-24 bg-elevated rounded"></div>
                    </div>
                  ) : error ? (
                    <div className="text-error">
                      Unable to load account information
                    </div>
                  ) : user ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-primary uppercase tracking-wide">Full Name</label>
                          <p className="text-primary font-mono tabular-nums mt-1">{user.full_name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-primary uppercase tracking-wide">Username</label>
                          <p className="text-primary font-mono tabular-nums mt-1">@{user.username}</p>
                        </div>
                        <div>
                          <label className="text-xs text-primary uppercase tracking-wide">Email</label>
                          <p className="text-primary font-mono tabular-nums mt-1">{user.email}</p>
                        </div>
                        <div>
                          <label className="text-xs text-primary uppercase tracking-wide">Account Type</label>
                          <p className="text-primary mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              user.role === 'ADMIN' 
                                ? 'bg-warning/20 text-warning' 
                                : 'bg-accent-blue/20 text-primary'
                            }`}>
                              {user.role}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-subtle">
                        <div>
                          <label className="text-xs text-primary uppercase tracking-wide">Member Since</label>
                          <p className="text-primary font-mono tabular-nums mt-1">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-primary uppercase tracking-wide">Account Status</label>
                          <p className="text-primary mt-1">
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
                          <label className="text-xs text-primary uppercase tracking-wide">Last Login</label>
                          <p className="text-primary font-mono tabular-nums mt-1">
                            {new Date(user.last_login_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Account Settings */}
                <div className="bg-surface border border-subtle rounded-lg p-6">
                  <h2 className="heading-lg text-primary mb-4">Account Settings</h2>
                  {isLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-elevated rounded"></div>
                      <div className="h-16 bg-elevated rounded"></div>
                      <div className="h-16 bg-elevated rounded"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-subtle">
                        <div>
                          <h3 className="heading-md text-primary">Email Notifications</h3>
                          <p className="text-sm text-primary">Receive updates about your trades and market resolutions</p>
                        </div>
                        <button className="text-primary hover:text-primary transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-subtle">
                        <div>
                          <h3 className="heading-md text-primary">Security</h3>
                          <p className="text-sm text-primary">Manage your password and authentication settings</p>
                        </div>
                        <button className="text-primary hover:text-primary transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h3 className="heading-md text-primary">Privacy</h3>
                          <p className="text-sm text-primary">Control your data and privacy preferences</p>
                        </div>
                        <button className="text-primary hover:text-primary transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Balance Card */}
                <BalanceCard />

                {/* Quick Actions */}
                <div className="bg-surface border border-subtle rounded-lg p-6">
                  <h2 className="heading-lg text-primary mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <Link 
                      href="/dashboard"
                      className="block w-full text-center bg-accent-blue hover:bg-accent-blue-hover text-white py-2 px-4 rounded transition-colors"
                    >
                      View Dashboard
                    </Link>
                    <Link 
                      href="/markets"
                      className="block w-full text-center border border-accent-blue text-primary hover:bg-accent-blue hover:text-white py-2 px-4 rounded transition-colors"
                    >
                      Browse Markets
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ClientOnly>
      </div>
    </div>
  );
}
