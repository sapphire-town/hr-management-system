'use client';

import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string | string[];
  xAxisKey: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
}

const defaultColors = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#a855f7', // purple
];

export function BarChart({
  data,
  dataKey,
  xAxisKey,
  colors = defaultColors,
  showGrid = true,
  showLegend = false,
  stacked = false,
  horizontal = false,
}: BarChartProps) {
  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];

  const Chart = (
    <RechartsBarChart
      data={data}
      layout={horizontal ? 'vertical' : 'horizontal'}
      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
    >
      {showGrid && (
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          horizontal={!horizontal}
          vertical={horizontal}
        />
      )}
      {horizontal ? (
        <>
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey={xAxisKey}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
        </>
      ) : (
        <>
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
        </>
      )}
      <Tooltip
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        labelStyle={{ color: '#111827' }}
        cursor={{ fill: '#f5f3ff' }}
      />
      {showLegend && <Legend />}
      {dataKeys.map((key, index) => (
        <Bar
          key={key}
          dataKey={key}
          stackId={stacked ? 'stack' : undefined}
          fill={colors[index % colors.length]}
          radius={[4, 4, 0, 0]}
        />
      ))}
    </RechartsBarChart>
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        {Chart}
      </ResponsiveContainer>
    </div>
  );
}
