'use client';

import { use, useEffect, useState } from 'react';
import { ArrowLeft, Phone, PhoneMissed, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration, formatPhoneNumber, formatDate, formatTime } from '@/lib/utils';
import type { Call } from '@/types';

const outcomeConfig = {
  booked: { label: 'Booked', icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200' },
  info: { label: 'Info', icon: Info, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  missed: { label: 'Missed', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  follow_up: { label: 'Follow-up', icon: AlertCircle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCall() {
      try {
        const res = await fetch('/api/calls');
        if (!res.ok) throw new Error('Failed to fetch calls');
        const calls: Call[] = await res.json();
        const found = calls.find((c) => c.id === id) || null;
        setCall(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchCall();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Call Not Found</h1>
        <p className="text-gray-500 mt-2">
          The call with ID &quot;{id}&quot; does not exist.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const outcome = outcomeConfig[call.outcome];
  const OutcomeIcon = outcome.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="transition-all duration-300 hover:shadow-md hover:-translate-x-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Details</h1>
          <p className="text-gray-500 text-sm">{call.contactName} &middot; {formatPhoneNumber(call.phone)}</p>
        </div>
      </div>

      {/* Call metadata */}
      <Card className="ag-glass ag-float-card rounded-xl">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Caller</p>
              <p className="text-sm font-semibold">{call.contactName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone</p>
              <p className="text-sm">{formatPhoneNumber(call.phone)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Duration</p>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {call.duration > 0 ? formatDuration(call.duration) : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Outcome</p>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${outcome.className}`}>
                <OutcomeIcon className="h-3 w-3" />
                {outcome.label}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cost</p>
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {call.cost != null ? `$${call.cost.toFixed(2)}` : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Date</p>
              <p className="text-sm">
                {formatDate(call.createdAt)}
                <br />
                <span className="text-xs text-muted-foreground">{formatTime(call.createdAt)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio player */}
      {(call.recordingUrl || call.stereoRecordingUrl) && (
        <Card className="ag-glass ag-float-card rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-flowmax-navy/5 to-transparent rounded-xl p-3">
              <audio controls className="w-full" preload="none">
                <source src={call.stereoRecordingUrl || call.recordingUrl!} type="audio/wav" />
              </audio>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {call.summary && (
        <Card className="ag-glass ag-float-card rounded-xl">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{call.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {call.transcript.length > 0 && (
        <Card className="ag-glass ag-float-card rounded-xl">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {call.transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'ai'
                        ? 'bg-blue-50/80 text-blue-900 rounded-bl-md border border-blue-100/50'
                        : 'bg-gray-100/80 text-gray-900 rounded-br-md border border-gray-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {msg.role === 'ai' ? 'AI Assistant' : 'Customer'}
                      </span>
                      {msg.timestamp && (
                        <span className="text-[10px] opacity-50">{formatTime(msg.timestamp)}</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {call.transcript.length === 0 && call.outcome === 'missed' && (
        <Card className="ag-glass ag-float-card rounded-xl">
          <CardContent className="py-8 text-center">
            <PhoneMissed className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No transcript available for this missed call.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
