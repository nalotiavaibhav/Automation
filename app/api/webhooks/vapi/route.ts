import { NextResponse } from 'next/server';
import { extractVapiCallData } from '@/lib/crm/vapi-extractor';
import { processCrmSync } from '@/lib/crm/sync-orchestrator';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Only process end-of-call-report events
    const messageType = payload?.message?.type;
    if (messageType !== 'end-of-call-report') {
      return NextResponse.json({ received: true, processed: false });
    }

    // Extract structured call data
    const callData = extractVapiCallData(payload);
    if (!callData) {
      console.warn('[Vapi Webhook] Could not extract call data from payload');
      return NextResponse.json({ received: true, processed: false });
    }

    console.log(
      `[Vapi Webhook] End-of-call-report received for call ${callData.callId}, phone=${callData.customerPhone}`
    );

    // Fire-and-forget: CRM sync should not block the webhook response.
    // Use the default business ID from env or derive from assistant mapping.
    const businessId = process.env.DEFAULT_BUSINESS_ID || 'default';
    processCrmSync(businessId, callData).catch((err) => {
      console.error('[Vapi Webhook] CRM sync failed:', err);
    });

    // Return 200 immediately so Vapi does not retry
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error('[Vapi Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
