import { NextResponse } from 'next/server';

const ZOHO_WEBHOOK_TOKEN = process.env.ZOHO_WEBHOOK_TOKEN || '';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    // Validate webhook token if configured
    if (ZOHO_WEBHOOK_TOKEN) {
      const token = payload.token as string | undefined;
      if (token !== ZOHO_WEBHOOK_TOKEN) {
        console.warn('[Zoho Webhook] Invalid webhook token');
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    const module = payload.module as string | undefined;
    const operation = payload.operation as string | undefined;
    const ids = payload.ids as string[] | undefined;

    console.log(
      `[Zoho Webhook] Event: module=${module}, operation=${operation}, ids=${ids?.join(',')}`
    );

    switch (module) {
      case 'Contacts':
        console.log(`[Zoho Webhook] Contact ${operation}: ${ids?.join(',')}`);
        break;
      case 'Deals':
        console.log(`[Zoho Webhook] Deal ${operation}: ${ids?.join(',')}`);
        break;
      case 'Calls':
        console.log(`[Zoho Webhook] Call ${operation}: ${ids?.join(',')}`);
        break;
      case 'Events':
        console.log(`[Zoho Webhook] Event ${operation}: ${ids?.join(',')}`);
        break;
      default:
        console.log(`[Zoho Webhook] Unhandled module: ${module}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Zoho Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
