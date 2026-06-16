import React from 'react';

interface ProbabilityBarProps {
  yesPrice: number | null | undefined;
  noPrice: number | null | undefined;
  /** Show percentage labels above the bar (default: false) */
  showLabels?: boolean;
}

/**
 * ProbabilityBar — thick segmented split bar showing YES/NO probability.
 * Labels are optional; when omitted the parent card renders them inline.
 */
export function ProbabilityBar({ yesPrice, noPrice, showLabels = false }: ProbabilityBarProps) {
  const yes = Number.isFinite(yesPrice) ? Math.max(0, Math.min(100, yesPrice as number)) : 0;
  const yesLabel = Number.isFinite(yesPrice) ? `${Math.round(yesPrice as number)}%` : '--';
  const noLabel  = Number.isFinite(noPrice)  ? `${Math.round(noPrice  as number)}%` : '--';

  return (
    <div className="flex flex-col gap-1.5">
      {showLabels && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-yes-strong">Yes {yesLabel}</span>
          <span className="text-xs font-mono font-semibold text-no-strong">No {noLabel}</span>
        </div>
      )}
      {/* Thick split bar */}
      <div className="relative h-3 w-full rounded-full overflow-hidden bg-[rgba(255,23,68,0.3)]">
        <div
          className="absolute left-0 top-0 h-full rounded-l-full bg-[rgba(0,200,83,0.75)] transition-all duration-500"
          style={{ width: `${yes}%` }}
        />
      </div>
    </div>
  );
}

export default ProbabilityBar;
