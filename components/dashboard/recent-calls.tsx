'use client';

import { Phone, PhoneMissed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { recentCalls } from '@/lib/mock-data';
import { formatDuration, formatPhoneNumber } from '@/lib/utils';
import Link from 'next/link';

function timeAgo(dateString: string): string {
  const now = new Date('2026-03-28T12:00:00Z');
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function RecentCalls() {
  const calls = recentCalls.slice(0, 5);

  return (
    <Card className="flex flex-col ag-glass ag-float-card rounded-xl">
      <CardHeader>
        <CardTitle>Recent Calls</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-1">
          {calls.map((call) => (
            <Link
              key={call.id}
              href={`/calls/${call.id}`}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 hover:bg-white/60 hover:translate-x-1 hover:shadow-[inset_0_0_0_1px_rgba(245,158,11,0.1)]"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${
                  call.status === 'completed'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {call.status === 'completed' ? (
                  <Phone className="h-3.5 w-3.5" />
                ) : (
                  <PhoneMissed className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {call.contactName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPhoneNumber(call.phone)}
                  {call.duration > 0 && ` \u00B7 ${formatDuration(call.duration)}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge
                  variant={call.status === 'completed' ? 'default' : 'destructive'}
                  className="text-[10px] px-1.5"
                >
                  {call.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(call.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/calls"
          className="text-sm font-medium text-primary transition-all duration-300 hover:underline hover:tracking-wide"
        >
          View All Calls
        </Link>
      </CardFooter>
    </Card>
  );
}
