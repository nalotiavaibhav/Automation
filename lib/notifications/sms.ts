import twilio, { type Twilio } from 'twilio';

export interface SmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  errorCode?: number;
  errorMessage?: string;
  sentAt: string;
}

export interface EmergencySmsArgs {
  callId: string;
  customerPhone: string;
  summary: string;
  endedAt: string;
  deepLink: string;
}

let cachedClient: Twilio | null = null;

function getClient(): Twilio | null {
  if (cachedClient) return cachedClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn('[SMS] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing; SMS disabled');
    return null;
  }
  cachedClient = twilio(sid, token);
  return cachedClient;
}

function formatLocalTime(iso: string, timezone: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return iso;
  }
}

function buildBody(args: EmergencySmsArgs): string {
  const tz = process.env.OWNER_TIMEZONE || 'America/New_York';
  const ts = formatLocalTime(args.endedAt, tz);
  const summary = args.summary.length > 110
    ? `${args.summary.slice(0, 107)}...`
    : args.summary;
  return [
    'EMERGENCY CALL - Flowmax',
    `From: ${args.customerPhone}`,
    `Summary: ${summary}`,
    ts,
    `Open: ${args.deepLink}`,
  ].join('\n');
}

export async function sendEmergencySms(args: EmergencySmsArgs): Promise<SmsResult> {
  const sentAt = new Date().toISOString();
  const client = getClient();
  const from = process.env.TWILIO_FROM_PHONE;
  const to = process.env.OWNER_ALERT_PHONE;

  if (!client || !from || !to) {
    const missing = [
      !client && 'TWILIO credentials',
      !from && 'TWILIO_FROM_PHONE',
      !to && 'OWNER_ALERT_PHONE',
    ].filter(Boolean).join(', ');
    console.error(`[SMS] Cannot send emergency SMS — missing: ${missing}`);
    return {
      success: false,
      errorMessage: `Missing configuration: ${missing}`,
      sentAt,
    };
  }

  const body = buildBody(args);
  try {
    const message = await client.messages.create({ body, from, to });
    console.log(
      `[SMS] Emergency SMS dispatched sid=${message.sid} status=${message.status} call=${args.callId}`
    );
    return {
      success: true,
      sid: message.sid,
      status: message.status,
      sentAt,
    };
  } catch (err) {
    const e = err as { code?: number; message?: string };
    console.error(
      `[SMS] Emergency SMS failed call=${args.callId} code=${e.code} message=${e.message}`
    );
    return {
      success: false,
      errorCode: e.code,
      errorMessage: e.message,
      sentAt,
    };
  }
}

export async function listRecentMessagesTo(
  to: string,
  from: string,
  sinceISO: string
): Promise<Array<{ sid: string; status: string; body: string | null; dateSent: Date | null }>> {
  const client = getClient();
  if (!client) return [];
  try {
    const messages = await client.messages.list({
      to,
      from,
      dateSentAfter: new Date(sinceISO),
      limit: 50,
    });
    return messages.map((m) => ({
      sid: m.sid,
      status: m.status,
      body: m.body,
      dateSent: m.dateSent,
    }));
  } catch (err) {
    const e = err as { message?: string };
    console.error(`[SMS] listRecentMessagesTo failed: ${e.message}`);
    return [];
  }
}
