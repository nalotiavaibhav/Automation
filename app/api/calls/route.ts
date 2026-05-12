import { NextResponse } from 'next/server';
import type { CallOutcome } from '@/types';

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || '';

const EMERGENCY_KEYWORDS = /\b(emergency|burst|sewage|gas smell|gas leak|flood|no heat|frozen pipe)\b/i;
const URGENT_KEYWORDS = /\b(leak|no hot water|clogged|backed up|broken|overflow|water heater)\b/i;

function deriveUrgency(summary: string, structuredData: Record<string, unknown>): 'routine' | 'urgent' | 'emergency' {
  if (structuredData.urgency) {
    const u = (structuredData.urgency as string).toLowerCase();
    if (u === 'emergency') return 'emergency';
    if (u === 'urgent') return 'urgent';
    if (u === 'routine') return 'routine';
  }
  if (EMERGENCY_KEYWORDS.test(summary)) return 'emergency';
  if (URGENT_KEYWORDS.test(summary)) return 'urgent';
  return 'routine';
}

function deriveOutcome(status: string, success: boolean): CallOutcome {
  if (status === 'missed' || status === 'no-answer') return 'missed';
  if (success) return 'booked';
  if (status === 'ended' || status === 'completed') return 'follow_up';
  return 'info';
}

function extractContactName(
  analysis: Record<string, unknown>,
  messages: Array<Record<string, unknown>>
): string {
  const structuredData = (analysis.structuredData ?? {}) as Record<string, unknown>;
  if (structuredData.firstName) {
    const first = structuredData.firstName as string;
    const last = (structuredData.lastName as string) || '';
    return last ? `${first} ${last}` : first;
  }

  // Check tool call results for customer info
  for (const msg of messages) {
    if (msg.role === 'tool_calls' || msg.role === 'tool_call_result') {
      const toolCalls = (msg.toolCalls ?? msg.tool_calls ?? []) as Array<Record<string, unknown>>;
      for (const tc of toolCalls) {
        const fn = (tc.function ?? tc) as Record<string, unknown>;
        const name = (fn.name as string) || '';
        if (['createContact', 'create_contact', 'collectCustomerInfo', 'collect_customer_info'].includes(name)) {
          let args: Record<string, unknown> = {};
          try {
            args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments as Record<string, unknown>) ?? {};
          } catch { /* ignore */ }
          if (args.firstName) {
            const first = args.firstName as string;
            const last = (args.lastName as string) || '';
            return last ? `${first} ${last}` : first;
          }
        }
      }
    }
  }

  return 'Unknown Caller';
}

export async function GET() {
  if (!VAPI_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'VAPI_PRIVATE_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch calls from Vapi' },
        { status: response.status }
      );
    }

    const calls = await response.json();

    const transformedCalls = calls.map((call: Record<string, unknown>) => {
      const messages = (call.messages as Array<Record<string, unknown>>) || [];
      const transcript = messages
        .filter(
          (m) =>
            ['assistant', 'bot', 'user'].includes(m.role as string) &&
            ((m.message as string) || (m.content as string))
        )
        .map((m) => ({
          role: m.role === 'user' ? 'customer' : 'ai',
          content: (m.message as string) || (m.content as string) || '',
          timestamp: (m.time as string) || (m.timestamp as string) || '',
        }));

      const artifact = (call.artifact as Record<string, unknown>) || {};
      const customer = (call.customer as Record<string, unknown>) || {};
      const analysis = (call.analysis as Record<string, unknown>) || {};
      const structuredData = (analysis.structuredData ?? {}) as Record<string, unknown>;

      const startedAt = (call.startedAt as string) || '';
      const endedAt = (call.endedAt as string) || '';
      const summary = (analysis.summary as string) || '';
      const status = (call.status as string) || '';
      const success = analysis.successEvaluation === 'true' || analysis.successEvaluation === true;

      const contactName = extractContactName(analysis, messages);

      return {
        id: call.id,
        contactName,
        phone: (customer.number as string) || 'Unknown',
        status: status === 'ended' ? 'completed' : status,
        type: call.type || 'inbound',
        createdAt: call.createdAt || startedAt,
        endedAt,
        cost: call.cost,
        summary,
        success,
        outcome: deriveOutcome(status, success),
        urgency: deriveUrgency(summary, structuredData),
        serviceType: (structuredData.serviceType as string) || undefined,
        transcript,
        duration:
          endedAt && startedAt
            ? Math.round(
                (new Date(endedAt).getTime() -
                  new Date(startedAt).getTime()) /
                  1000
              )
            : 0,
        recordingUrl:
          (artifact.recordingUrl as string) ||
          (call.recordingUrl as string) ||
          null,
        stereoRecordingUrl:
          (artifact.stereoRecordingUrl as string) ||
          (call.stereoRecordingUrl as string) ||
          null,
      };
    });

    return NextResponse.json(transformedCalls);
  } catch (error) {
    console.error('Error fetching Vapi calls:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
