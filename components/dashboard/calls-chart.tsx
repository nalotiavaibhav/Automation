'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { callsChartData7Days, callsChartData30Days } from '@/lib/mock-data';

type Range = '7d' | '30d';

export function CallsChart() {
  const [range, setRange] = useState<Range>('7d');

  const data = range === '7d' ? callsChartData7Days : callsChartData30Days;

  return (
    <Card className="ag-glass ag-float-card rounded-xl">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Call Volume</CardTitle>
        <div className="flex items-center gap-1 rounded-full ag-glass p-0.5">
          <Button
            variant={range === '7d' ? 'default' : 'ghost'}
            size="xs"
            className="rounded-full transition-all duration-300"
            onClick={() => setRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={range === '30d' ? 'default' : 'ghost'}
            size="xs"
            className="rounded-full transition-all duration-300"
            onClick={() => setRange('30d')}
          >
            30 Days
          </Button>
        </div>
      </CardHeader>
      <CardContent className="ag-enter">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="callsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bookingsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={35}
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
            <Area
              type="monotone"
              dataKey="calls"
              fill="url(#callsAreaGrad)"
              stroke="transparent"
            />
            <Area
              type="monotone"
              dataKey="bookings"
              fill="url(#bookingsAreaGrad)"
              stroke="transparent"
            />
            <Line
              type="monotone"
              dataKey="calls"
              name="Calls"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="bookings"
              name="Bookings"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
