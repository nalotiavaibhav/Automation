import { NextResponse } from 'next/server';
import crypto from 'crypto';

const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || '';

/**
 * Validates the HubSpot webhook signature (v2).
 * HubSpot signs payloads with: SHA-256(clientSecret + requestBody)
 * and sends the hash in X-HubSpot-Signature-v3 (or v2 fallback).
 */
function validateHubSpotSignature(
  body: string,
  signature: string | null
): boolean {
  if (!HUBSPOT_CLIENT_SECRET || !signature) return false;

  const hash = crypto
    .createHash('sha256')
    .update(HUBSPOT_CLIENT_SECRET + body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-hubspot-signature-v3') ||
      request.headers.get('x-hubspot-signature');

    // Validate signature when client secret is configured
    if (HUBSPOT_CLIENT_SECRET && !validateHubSpotSignature(rawBody, signature)) {
      console.warn('[HubSpot Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const events: Array<Record<string, unknown>> = JSON.parse(rawBody);

    for (const event of events) {
      const subscriptionType = event.subscriptionType as string;
      const objectId = event.objectId;

      console.log(
        `[HubSpot Webhook] Event: ${subscriptionType}, objectId=${objectId}`
      );

      // Process based on event type
      switch (subscriptionType) {
        case 'contact.creation':
          console.log(`[HubSpot Webhook] New contact created: ${objectId}`);
          break;
        case 'contact.propertyChange':
          console.log(
            `[HubSpot Webhook] Contact updated: ${objectId}, property=${event.propertyName}`
          );
          break;
        case 'deal.creation':
          console.log(`[HubSpot Webhook] New deal created: ${objectId}`);
          break;
        case 'deal.propertyChange':
          console.log(
            `[HubSpot Webhook] Deal updated: ${objectId}, property=${event.propertyName}`
          );
          break;
        default:
          console.log(`[HubSpot Webhook] Unhandled event type: ${subscriptionType}`);
      }
    }

    // Must respond within 5 seconds per HubSpot requirements
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[HubSpot Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
