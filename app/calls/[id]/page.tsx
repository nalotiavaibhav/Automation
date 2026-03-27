'use client';

import { use } from 'react';
import { ArrowLeft, Phone, PhoneMissed, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { recentCalls } from '@/lib/mock-data';
import { formatDuration, formatPhoneNumber, formatDate, formatTime } from '@/lib/utils';

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const call = recentCalls.find((c) => c.id === id);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Details</h1>
          <p className="text-gray-500 text-sm">{call.id}</p>
        </div>
      </div>

      {/* Call metadata */}
      <Card>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Caller
              </p>
              <p className="text-sm font-semibold">{call.contactName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Phone
              </p>
              <p className="text-sm">{formatPhoneNumber(call.phone)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Duration
              </p>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {call.duration > 0 ? formatDuration(call.duration) : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Status
              </p>
              <div className="flex items-center gap-1.5">
                {call.status === 'completed' ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                )}
                <Badge
                  variant={call.status === 'completed' ? 'default' : 'destructive'}
                >
                  {call.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Cost
              </p>
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {call.cost !== undefined ? `$${call.cost.toFixed(2)}` : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Date
              </p>
              <p className="text-sm">
                {formatDate(call.createdAt)}
                <br />
                <span className="text-xs text-muted-foreground">
                  {formatTime(call.createdAt)}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio player */}
      {call.recordingUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <audio controls className="w-full" preload="none">
              <source src={call.recordingUrl} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {call.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {call.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {call.transcript.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {call.transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'ai' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'ai'
                        ? 'bg-blue-50 text-blue-900 rounded-bl-md'
                        : 'bg-gray-100 text-gray-900 rounded-br-md'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {msg.role === 'ai' ? 'AI Assistant' : 'Customer'}
                      </span>
                      <span className="text-[10px] opacity-50">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {call.transcript.length === 0 && call.status === 'missed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <PhoneMissed className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No transcript available for this missed call.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
