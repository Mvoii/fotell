import React from 'react';
import { usePositions } from '@/hooks/useUser';

interface PositionsListProps {
  className?: string;
}

export function PositionsList({ className = '' }: PositionsListProps) {
  const { data: positions, isLoading, error } = usePositions();

  return (
    <div className={`bg-surface border border-subtle rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-lg text-primary">Your Positions</h3>
        <span className="text-xs text-primary bg-elevated px-2 py-1 rounded">
          Coming Soon
        </span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-elevated rounded"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-primary text-sm">
          Unable to load positions
        </div>
      )}

      {!isLoading && !error && (
        <div className="text-center py-8">
          <div className="text-primary mb-2">
            <svg 
              className="w-12 h-12 mx-auto opacity-50" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
          </div>
          <p className="text-primary text-sm mb-1">
            Position tracking is coming soon
          </p>
          <p className="text-primary text-xs">
            Once implemented, you&apos;ll see all your market holdings here
          </p>
          {positions && positions.length > 0 && (
            <p className="text-xs text-primary mt-2">
              Found {positions.length} position(s) in backend
            </p>
          )}
        </div>
      )}
    </div>
  );
}
