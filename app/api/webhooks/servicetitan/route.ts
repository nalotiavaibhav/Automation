import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SERVICETITAN_WEBHOOK_SECRET = process.env.SERVICETITAN_WEBHOOK_SECRET || '';

/**
 * Validates ServiceTitan webhook HMAC signature.
 * ServiceTitan signs payloads with HMAC-SHA256 using the webhook secret
 * and sends the signature in the X-ST-Signature header.
 */
function validateServiceTitanSignature(
  body: string,
  signature: string | null
): boolean {
  if (!SERVICETITAN_WEBHOOK_SECRET || !signature) return false;

  const hmac = crypto
    .createHmac('sha256', SERVICETITAN_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-st-signature');

    // Validate HMAC signature when secret is configured
    if (
      SERVICETITAN_WEBHOOK_SECRET &&
      !validateServiceTitanSignature(rawBody, signature)
    ) {
      console.warn('[ServiceTitan Webhook] Invalid HMAC signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: Record<string, unknown> = JSON.parse(rawBody);
    const eventType = (payload.eventType ?? payload.type ?? 'unknown') as string;
    const resourceId = payload.resourceId ?? payload.id;

    console.log(
      `[ServiceTitan Webhook] Event: ${eventType}, resourceId=${resourceId}`
    );

    // Process based on event type
    switch (eventType) {
      case 'customer.created':
        console.log(`[ServiceTitan Webhook] New customer created: ${resourceId}`);
        break;
      case 'customer.updated':
        console.log(`[ServiceTitan Webhook] Customer updated: ${resourceId}`);
        break;
      case 'job.created':
        console.log(`[ServiceTitan Webhook] New job created: ${resourceId}`);
        break;
      case 'job.completed':
        console.log(`[ServiceTitan Webhook] Job completed: ${resourceId}`);
        break;
      case 'appointment.scheduled':
        console.log(`[ServiceTitan Webhook] Appointment scheduled: ${resourceId}`);
        break;
      case 'appointment.completed':
        console.log(`[ServiceTitan Webhook] Appointment completed: ${resourceId}`);
        break;
      default:
        console.log(`[ServiceTitan Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[ServiceTitan Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
