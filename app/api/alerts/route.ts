import { NextResponse } from 'next/server';
import { listRecentMessagesTo } from '@/lib/notifications/sms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface AlertStatus {
  callId: string;
  found: boolean;
  status?: string;
  sid?: string;
  sentAt?: string;
  to?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callId = url.searchParams.get('callId');
  if (!callId) {
    return NextResponse.json({ error: 'callId is required' }, { status: 400 });
  }

  const to = process.env.OWNER_ALERT_PHONE;
  const from = process.env.TWILIO_FROM_PHONE;

  if (!to || !from) {
    const payload: AlertStatus = { callId, found: false };
    return NextResponse.json(payload);
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const messages = await listRecentMessagesTo(to, from, since);
  const match = messages.find((m) => m.body?.includes(`/calls/${callId}`));

  if (!match) {
    const payload: AlertStatus = { callId, found: false };
    return NextResponse.json(payload);
  }

  const payload: AlertStatus = {
    callId,
    found: true,
    sid: match.sid,
    status: match.status,
    sentAt: match.dateSent?.toISOString(),
    to,
  };
  return NextResponse.json(payload);
}
