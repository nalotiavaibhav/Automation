'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Call } from '@/types';

interface CallsChartProps {
  calls: Call[];
}

export function CallsChart({ calls }: CallsChartProps) {
  const chartData = useMemo(() => {
    const dayMap = new Map<string, { calls: number; booked: number }>();

    for (const call of calls) {
      const date = new Date(call.createdAt);
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = dayMap.get(key) || { calls: 0, booked: 0 };
      existing.calls += 1;
      if (call.outcome === 'booked') existing.booked += 1;
      dayMap.set(key, existing);
    }

    return Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .slice(-14); // last 14 days max
  }, [calls]);

  if (chartData.length < 2) return null;

  return (
    <Card className="ag-glass ag-float-card rounded-xl">
      <CardHeader>
        <CardTitle>Call Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
            />
            <Bar dataKey="calls" name="Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="booked" name="Booked" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
