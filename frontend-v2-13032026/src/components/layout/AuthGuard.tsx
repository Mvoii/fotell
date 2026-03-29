import React from 'react';
import { useUser } from '@/hooks/useUser';
import { ClientOnly } from '@/components/ui/ClientOnly';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, requireAdmin = false, fallback }: AuthGuardProps) {
  const { data: user, isLoading, error } = useUser();

  return (
    <ClientOnly
      fallback={
        fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-elevated rounded w-32"></div>
              <div className="h-4 bg-elevated rounded w-24"></div>
            </div>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-elevated rounded w-32"></div>
            <div className="h-4 bg-elevated rounded w-24"></div>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="heading-lg text-primary mb-4">Authentication Error</h2>
            <p className="text-primary mb-6">Unable to verify your authentication status.</p>
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="bg-accent-blue hover:bg-accent-blue-hover text-white px-6 py-2 rounded transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="heading-lg text-primary mb-4">Authentication Required</h2>
            <p className="text-primary mb-6">Please log in to access this page.</p>
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="bg-accent-blue hover:bg-accent-blue-hover text-white px-6 py-2 rounded transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      ) : requireAdmin && user.role !== 'ADMIN' ? (
        // DEMO MODE: Bypass admin check for demo purposes
        // ORIGINAL CODE (uncomment after demo):
        // <div className="flex items-center justify-center min-h-screen">
        //   <div className="text-center">
        //     <h2 className="heading-lg text-primary mb-4">Access Denied</h2>
        //     <p className="text-primary mb-6">This page requires administrator privileges.</p>
        //     <button
        //       onClick={() => window.location.href = '/dashboard'}
        //       className="bg-accent-blue hover:bg-accent-blue-hover text-white px-6 py-2 rounded transition-colors"
        //     >
        //       Go to Dashboard
        //     </button>
        //   </div>
        // </div>
        <>{children}</>
      ) : (
        <>{children}</>
      )}
    </ClientOnly>
  );
}
