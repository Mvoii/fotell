"use client";

import React, { useState } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { AppShell } from '@/components/layout/AppShell';
import PageContainer from '@/components/layout/PageContainer';
import { useUser } from '@/hooks/useUser';
import { useAdminUsers, useDeactivateUser } from '@/hooks/useAdmin';
import type { AdminUser } from '@/lib/api/types/admin';
import { ModalPortal } from '@/components/ui/ModalPortal';

export default function AdminUsersPage() {
  const { data: currentUser } = useUser();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  
  const { data, isLoading, error } = useAdminUsers(limit, page * limit);
  const deactivateMutation = useDeactivateUser();
  
  const [userToDeactivate, setUserToDeactivate] = useState<AdminUser | null>(null);

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await deactivateMutation.mutateAsync(userToDeactivate.id);
      setUserToDeactivate(null);
    } catch (e) {
      console.error(e);
    }
  };

  const users = data?.users || [];

  return (
    <AuthGuard requireAdmin={true}>
      <AppShell isAuthenticated={!!currentUser}>
        <PageContainer maxWidth="xl" inAppShell>
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="heading-xl text-primary mb-2">User Management</h1>
              <p className="text-primary">View and manage user accounts</p>
            </div>
          </div>

          <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle text-primary">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Joined</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted">
                        Loading users...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-error">
                        Failed to load users.
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((rawUser, index) => {
                      // Normalize the user object to handle backend serialization inconsistencies
                      // (before and after adding json tags to the Go struct)
                      const user = {
                        id: rawUser.id || (rawUser as any).ID,
                        username: rawUser.username || (rawUser as any).Username,
                        email: rawUser.email || (rawUser as any).Email,
                        full_name: rawUser.full_name || (rawUser as any).FullName,
                        role: rawUser.role || (rawUser as any).Role,
                        is_active: rawUser.is_active !== undefined ? rawUser.is_active : (rawUser as any).IsActive,
                        created_at: rawUser.created_at || (rawUser as any).CreatedAt,
                      } as AdminUser;

                      return (
                        <tr key={user.id || index} className="hover:bg-subtle/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold mr-3">
                                {(user.username || user.email || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-primary">{user.full_name || 'Unknown User'}</div>
                                <div className="text-xs text-muted">@{user.username || 'unknown'} • {user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN' 
                                ? 'bg-accent-blue/10 text-accent-blue' 
                                : 'bg-surface border border-subtle text-primary'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.is_active 
                                ? 'bg-accent-green/10 text-accent-green' 
                                : 'bg-error/10 text-error'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-primary">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {user.is_active && user.id !== currentUser?.id && (
                              <button
                                onClick={() => setUserToDeactivate(user)}
                                className="text-error hover:underline font-medium text-sm transition-colors"
                              >
                                Deactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-subtle flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted">Rows per page:</span>
                <select 
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(0);
                  }}
                  className="bg-surface border border-subtle text-primary text-sm rounded focus:ring-accent-blue focus:border-accent-blue block p-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="px-3 py-1 rounded border border-subtle text-primary hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-muted">
                  Page {page + 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={users.length < limit || isLoading}
                  className="px-3 py-1 rounded border border-subtle text-primary hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Deactivation Modal */}
          {userToDeactivate && (
            <ModalPortal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-surface border border-subtle rounded-xl max-w-md w-full p-6 shadow-xl">
                <h3 className="heading-lg text-primary mb-2">Deactivate User</h3>
                <p className="text-primary mb-6">
                  Are you sure you want to deactivate <span className="font-bold">@{userToDeactivate.username || userToDeactivate.email || 'unknown'}</span>? 
                  They will no longer be able to log in or trade.
                </p>
                
                {deactivateMutation.isError && (
                  <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-md text-error text-sm">
                    Failed to deactivate user. Please try again.
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setUserToDeactivate(null)}
                    disabled={deactivateMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-subtle text-primary hover:bg-subtle transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeactivate}
                    disabled={deactivateMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-50"
                  >
                    {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate User'}
                  </button>
                </div>
              </div>
            </div>
            </ModalPortal>
          )}
        </PageContainer>
      </AppShell>
    </AuthGuard>
  );
}
