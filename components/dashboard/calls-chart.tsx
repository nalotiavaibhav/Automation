'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
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
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Call Volume</CardTitle>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <Button
            variant={range === '7d' ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={range === '30d' ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setRange('30d')}
          >
            30 Days
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '13px',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
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
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
