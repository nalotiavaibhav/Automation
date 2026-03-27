import { NextResponse } from 'next/server';

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY || '';

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

      const startedAt = (call.startedAt as string) || '';
      const endedAt = (call.endedAt as string) || '';

      return {
        id: call.id,
        status: call.status,
        type: call.type || 'inbound',
        createdAt: call.createdAt || startedAt,
        endedAt,
        cost: call.cost,
        customerPhone: (customer.number as string) || 'Unknown',
        summary: (analysis.summary as string) || '',
        success:
          analysis.successEvaluation === 'true' ||
          analysis.successEvaluation === true,
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
