'use client';

import { Phone, Calendar, PhoneOff, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { dashboardStats, sparklineData } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: string;
  sparkData: { v: number }[];
}

function StatCard({ title, value, trend, icon, color, sparkData }: StatCardProps) {
  const isPositive = trend >= 0;

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-l-4 overflow-visible"
      style={{ borderLeftColor: color }}
    >
      <CardContent className="pt-1 pb-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {value}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  isPositive
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {isPositive ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1A` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#spark-${title.replace(/\s/g, '')})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const stats = dashboardStats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Calls Today"
        value={stats.totalCalls.toString()}
        trend={stats.totalCallsTrend}
        icon={<Phone className="h-5 w-5" />}
        color="#3b82f6"
        sparkData={sparklineData.totalCalls}
      />
      <StatCard
        title="Bookings Made"
        value={stats.bookingsMade.toString()}
        trend={stats.bookingsTrend}
        icon={<Calendar className="h-5 w-5" />}
        color="#10b981"
        sparkData={sparklineData.bookings}
      />
      <StatCard
        title="Missed Calls Recovered"
        value={stats.missedCallsRecovered.toString()}
        trend={stats.missedCallsTrend}
        icon={<PhoneOff className="h-5 w-5" />}
        color="#f59e0b"
        sparkData={sparklineData.missedRecovered}
      />
      <StatCard
        title="Revenue Impact"
        value={formatCurrency(stats.revenueImpact)}
        trend={stats.revenueTrend}
        icon={<DollarSign className="h-5 w-5" />}
        color="#8b5cf6"
        sparkData={sparklineData.revenue}
      />
    </div>
  );
}
