
import React from 'react';
import type { MarketPrices } from '@/lib/api/types/api';
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
}

// Placeholder: Replace with Recharts ComposedChart implementation
export function PriceChart({ prices, height = 200 }: PriceChartProps) {
  // Render actual chart with recharts
  // Import Recharts components
  // NOTE: You must have recharts installed in package.json
  // import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
  // For now, assume recharts is available
  const chartData = prices.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    yes: p.yes_price,
    no: p.no_price,
  }));
  return (
    <div className="w-full h-50 bg-transparent border border-subtle rounded-md">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 16, right: 24, left: 24, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" stroke="#4a5063" fontSize={11} />
          <YAxis domain={[0, 100]} stroke="#4a5063" fontSize={11} />
          <Tooltip contentStyle={{ background: '#22262f', border: '1px solid rgba(255,255,255,0.12)' }} />
          <Line type="monotone" dataKey="yes" stroke="#00c853" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="no" stroke="#ff1744" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
