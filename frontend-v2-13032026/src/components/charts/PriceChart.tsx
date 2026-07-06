'use client';

import React from 'react';
import type { MarketPrices, TimeRange } from '@/lib/api/types/api';
import { formatPrice } from '@/lib/formatters';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PriceChartProps {
  prices: MarketPrices[];
  height?: number;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1D', label: '1D' },
  { value: '5D', label: '5D' },
  { value: '1M', label: '1M' },
  { value: '1Y', label: '1Y' },
  { value: '5Y', label: '5Y' },
];

// Format date based on time range
function formatDate(timestamp: string, timeRange: TimeRange): string {
  const date = new Date(timestamp);

  switch (timeRange) {
    case '1D':
      // Show time for 1 day view
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '5D':
      // Show day and time for 5 day view
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    case '1M':
      // Show day and month for 1 month view
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case '1Y':
    case '5Y':
      // Show month and year for longer views
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
    default:
      return date.toLocaleTimeString();
  }
}

// Get tick interval based on data length
function getTickInterval(dataLength: number): number {
  if (dataLength <= 10) return 1;
  if (dataLength <= 20) return 2;
  if (dataLength <= 50) return 5;
  return Math.ceil(dataLength / 10);
}

export function PriceChart({
  prices,
  height = 200,
  timeRange = '1D',
  onTimeRangeChange,
}: PriceChartProps) {
  const chartData = prices.map((p) => ({
    time: formatDate(p.timestamp, timeRange),
    timestamp: p.timestamp,
    yes: p.yes_price,
    no: p.no_price,
  }));

  const tickInterval = getTickInterval(chartData.length);

  return (
    <div className="w-full">
      {/* Time Range Selector */}
      {onTimeRangeChange && (
        <div className="flex items-center justify-center gap-1 mb-4">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeRangeChange(option.value)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150
                ${timeRange === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface border border-subtle text-muted-foreground hover:text-primary hover:border-primary/50'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="w-full bg-transparent border border-subtle rounded-md">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 24, left: 24, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              stroke="#4a5063"
              fontSize={11}
              interval={tickInterval}
              angle={timeRange === '1D' ? 0 : -45}
              textAnchor={timeRange === '1D' ? 'middle' : 'end'}
              height={timeRange === '1D' ? 30 : 50}
            />
            <YAxis domain={[0, 100]} stroke="#4a5063" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: '#22262f',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
              }}
              labelStyle={{ color: '#9fa6b7' }}
              formatter={(value, name) => [
                value !== undefined && typeof value === 'number'
                  ? formatPrice(value, 'cents')
                  : '',
                name === 'yes' ? 'Yes' : name === 'no' ? 'No' : '',
              ]}
            />
            <Line
              type="monotone"
              dataKey="yes"
              stroke="#00c853"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#00c853' }}
            />
            <Line
              type="monotone"
              dataKey="no"
              stroke="#ff1744"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#ff1744' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
