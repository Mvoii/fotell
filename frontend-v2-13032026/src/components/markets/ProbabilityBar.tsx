import React from 'react';

interface ProbabilityBarProps {
  yesPrice: number | null;
  noPrice: number | null;
}

/**
 * ProbabilityBar - renders YES/NO percentages row and the probability bar, matching MarketsList markup exactly.
 */
export function ProbabilityBar({ yesPrice, noPrice }: ProbabilityBarProps) {
  const yes = Math.max(0, Math.min(100, yesPrice ?? 0));
  // The NO bar is always 100 - YES, but we keep the prop for symmetry
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm font-bold text-yes-strong flex items-center gap-1">
          {yesPrice !== null ? `${Math.round(yesPrice)}%` : '--'}
          {/* Optional: add checkmark or up icon */}
        </span>
        <span className="font-mono text-sm font-bold text-no-strong flex items-center gap-1">
          {noPrice !== null ? `${Math.round(noPrice)}%` : '--'}
          {/* Optional: add cross or down icon */}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full border border-subtle overflow-hidden z-10">
        {/* NO background: red, full width */}
        <div className="absolute left-0 top-0 h-full w-full rounded-full bg-red-500" />
        {/* YES fill: green, proportional to yes_price */}
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-green-500"
          style={{ width: `${yes}%` }}
        />
        <div className="absolute left-1/2 top-0 h-full w-0.5 bg-surface z-30" />
      </div>
    </>
  );
}

export default ProbabilityBar;
