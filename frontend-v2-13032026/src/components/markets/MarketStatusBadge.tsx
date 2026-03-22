import React from 'react';

interface MarketStatusBadgeProps {
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
  size?: 'sm' | 'md';
}

const statusStyles = {
  OPEN: {
    bg: 'bg-yes-dim',
    text: 'text-yes-strong',
    border: 'border-[rgba(0,200,83,0.3)]',
    label: 'Open',
  },
  PENDING: {
    bg: 'bg-[rgba(255,152,0,0.15)]',
    text: 'text-warning',
    border: 'border-[rgba(255,152,0,0.3)]',
    label: 'Pending',
  },
  CLOSED: {
    bg: 'bg-[rgba(139,146,165,0.15)]',
    text: 'text-primary',
    border: 'border-[rgba(139,146,165,0.3)]',
    label: 'Closed',
  },
  RESOLVED: {
    bg: 'bg-accent-blue-dim',
    text: 'text-primary',
    border: 'border-[rgba(33,150,243,0.3)]',
    label: 'Resolved',
  },
};

export default function MarketStatusBadge({ status, size = 'md' }: MarketStatusBadgeProps) {
  const style = statusStyles[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';
  return (
    <span
      className={`font-bold rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}
      aria-label={`Market status: ${style.label}`}
    >
      {style.label}
    </span>
  );
}
