import React from 'react';

interface ProbabilityBarProps {
  yesPrice: number | null;
  noPrice: number | null;
  /** Show percentage labels above the bar (default: false) */
  showLabels?: boolean;
}

/**
 * ProbabilityBar — thick segmented split bar showing YES/NO probability.
 * Labels are optional; when omitted the parent card renders them inline.
 */
export function ProbabilityBar({ yesPrice, noPrice, showLabels = false }: ProbabilityBarProps) {
  const yes = Math.max(0, Math.min(100, yesPrice ?? 0));
  const yesLabel = yesPrice !== null ? `${Math.round(yesPrice)}%` : '--';
  const noLabel  = noPrice  !== null ? `${Math.round(noPrice)}%`  : '--';

  return (
    <>
      {showLabels && (
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-sm font-bold text-yes-strong flex items-center gap-1">
            {yesLabel}
            {/* Optional: add checkmark or up icon */}
          </span>
          <span className="font-mono text-sm font-bold text-no-strong flex items-center gap-1">
            {noLabel}
            {/* Optional: add cross or down icon */}
          </span>
        </div>
      )}
      <div className="relative h-2 w-full rounded-full border border-subtle overflow-hidden">
        {/* NO background: red, full width */}
        <div className="absolute left-0 top-0 h-full w-full rounded-full bg-red-500" />
        {/* YES fill: green, proportional to yes_price */}
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-[rgba(0,200,83,0.75)] transition-all duration-500"
          style={{ width: `${yes}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-0.5 bg-surface" />
      </div>
    </>
  );
}

export default ProbabilityBar;
