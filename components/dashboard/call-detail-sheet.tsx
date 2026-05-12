'use client';

import { useEffect, useState } from 'react';
import { Phone, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Info, Copy, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDuration, formatPhoneNumber, formatRelativeDate, formatTime } from '@/lib/utils';
import type { Call } from '@/types';

interface AlertStatusResponse {
  callId: string;
  found: boolean;
  status?: string;
  sid?: string;
  sentAt?: string;
  to?: string;
}

const alertStatusStyle: Record<string, string> = {
  delivered: 'bg-green-50 text-green-700 border-green-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  queued: 'bg-amber-50 text-amber-700 border-amber-200',
  sending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  undelivered: 'bg-red-50 text-red-700 border-red-200',
};

function OwnerAlertSection({ callId }: { callId: string }) {
  const [data, setData] = useState<AlertStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/alerts?callId=${encodeURIComponent(callId)}`)
      .then((r) => r.json())
      .then((json: AlertStatusResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({ callId, found: false });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [callId]);

  return (
    <div className="py-4 border-b">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <MessageSquare className="h-3 w-3" /> Owner Alert
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Checking SMS delivery…</p>
      ) : !data?.found ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          No SMS alert dispatched for this emergency call. Check Twilio credentials in settings.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${alertStatusStyle[data.status ?? ''] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            {(data.status ?? 'unknown').toUpperCase()}
          </span>
          {data.to && (
            <span className="text-xs text-muted-foreground">
              to {formatPhoneNumber(data.to)}
            </span>
          )}
          {data.sentAt && (
            <span className="text-xs text-muted-foreground">
              · {formatTime(data.sentAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const outcomeConfig = {
  booked: { label: 'Booked', icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200' },
  info: { label: 'Info Provided', icon: Info, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  missed: { label: 'Missed', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  follow_up: { label: 'Follow-up', icon: AlertCircle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

interface CallDetailSheetProps {
  call: Call | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallDetailSheet({ call, open, onOpenChange }: CallDetailSheetProps) {
  if (!call) return null;

  const outcome = outcomeConfig[call.outcome];
  const OutcomeIcon = outcome.icon;

  function copyPhone() {
    navigator.clipboard.writeText(call!.phone);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-lg">
            Call with {call.contactName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {formatRelativeDate(call.createdAt)}
          </p>
        </SheetHeader>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-3 py-4 border-b">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Phone</p>
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{formatPhoneNumber(call.phone)}</span>
              <button onClick={copyPhone} className="ml-1 text-muted-foreground hover:text-foreground" title="Copy">
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Duration</p>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{call.duration > 0 ? formatDuration(call.duration) : 'N/A'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cost</p>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{call.cost != null ? `$${call.cost.toFixed(2)}` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Outcome + Urgency */}
        <div className="flex gap-2 py-3 border-b">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${outcome.className}`}>
            <OutcomeIcon className="h-3 w-3" />
            {outcome.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            call.urgency === 'emergency' ? 'bg-red-50 text-red-700 border-red-200' :
            call.urgency === 'urgent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-gray-50 text-gray-600 border-gray-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              call.urgency === 'emergency' ? 'bg-red-500' :
              call.urgency === 'urgent' ? 'bg-amber-500' : 'bg-gray-400'
            }`} />
            {call.urgency.charAt(0).toUpperCase() + call.urgency.slice(1)}
          </span>
        </div>

        {/* Owner Alert (emergency only) */}
        {call.urgency === 'emergency' && <OwnerAlertSection callId={call.id} />}

        {/* Recording */}
        {(call.recordingUrl || call.stereoRecordingUrl) && (
          <div className="py-4 border-b">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Recording</p>
            <div className="bg-gradient-to-r from-flowmax-navy/5 to-transparent rounded-xl p-3">
              <audio controls className="w-full" preload="none">
                <source src={call.stereoRecordingUrl || call.recordingUrl!} type="audio/wav" />
              </audio>
            </div>
          </div>
        )}

        {/* Summary */}
        {call.summary && (
          <div className="py-4 border-b">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Summary</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{call.summary}</p>
          </div>
        )}

        {/* Transcript */}
        {call.transcript.length > 0 && (
          <div className="py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Transcript</p>
            <div className="space-y-3">
              {call.transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'ai'
                        ? 'bg-blue-50 text-blue-900 rounded-bl-md border border-blue-100/50'
                        : 'bg-gray-100 text-gray-900 rounded-br-md border border-gray-200/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-60">
                        {msg.role === 'ai' ? 'AI' : 'Customer'}
                      </span>
                      {msg.timestamp && (
                        <span className="text-[9px] opacity-40">{formatTime(msg.timestamp)}</span>
                      )}
                    </div>
                    <p className="leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {call.transcript.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No transcript available.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
