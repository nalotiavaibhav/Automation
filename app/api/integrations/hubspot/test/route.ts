import { NextResponse } from 'next/server';
import { tokenStore } from '@/lib/crm/token-store';
import { HubSpotAdapter } from '@/lib/crm/adapters/hubspot';

/**
 * POST /api/integrations/hubspot/test
 *
 * Runs a smoke test against HubSpot: creates a test contact, logs a call,
 * creates a deal, and optionally cleans up.
 *
 * Query: ?cleanup=true to delete test records after verification.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const cleanup = url.searchParams.get('cleanup') === 'true';

  const results: Record<string, { ok: boolean; id?: string; error?: string }> = {};

  try {
    const tokens = await tokenStore.getTokens('default', 'hubspot');
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'HubSpot is not connected. Connect first via /api/integrations/hubspot/connect.' },
        { status: 400 },
      );
    }

    const adapter = new HubSpotAdapter(tokens);

    // Test 1: Connection
    try {
      const status = await adapter.getConnectionStatus();
      results.connection = { ok: status.connected };
      if (!status.connected) {
        results.connection.error = status.error || 'Not connected';
        return NextResponse.json({ success: false, results });
      }
    } catch (e) {
      results.connection = { ok: false, error: (e as Error).message };
      return NextResponse.json({ success: false, results });
    }

    // Test 2: Create Contact
    let contactExternalId: string | undefined;
    try {
      const contactResult = await adapter.createContact({
        firstName: 'Flowmax Test',
        lastName: 'Contact',
        phone: '+15551234567',
        email: 'flowmax-test@example.com',
      });
      contactExternalId = contactResult.externalId;
      results.contact = { ok: contactResult.success, id: contactExternalId };
      if (!contactResult.success) results.contact.error = contactResult.error;
    } catch (e) {
      results.contact = { ok: false, error: (e as Error).message };
    }

    // Test 3: Log Call
    try {
      if (contactExternalId) {
        const callResult = await adapter.logCall({
          contactId: 'test',
          externalContactId: contactExternalId,
          direction: 'inbound',
          duration: 120,
          transcript: 'Test call from Flowmax AI Receptionist verification.',
          summary: 'Automated integration test — safe to delete.',
          timestamp: new Date().toISOString(),
          outcome: 'Information Provided',
        });
        results.call = { ok: callResult.success, id: callResult.externalId };
        if (!callResult.success) results.call.error = callResult.error;
      } else {
        results.call = { ok: false, error: 'Skipped — no contact ID' };
      }
    } catch (e) {
      results.call = { ok: false, error: (e as Error).message };
    }

    // Test 4: Create Deal
    try {
      if (contactExternalId) {
        const dealResult = await adapter.createDeal({
          title: 'Flowmax Test Deal — Safe to Delete',
          contactId: 'test',
          externalContactId: contactExternalId,
          description: 'Automated integration test from Flowmax AI Receptionist.',
          stage: 'appointmentscheduled',
        });
        results.deal = { ok: dealResult.success, id: dealResult.externalId };
        if (!dealResult.success) results.deal.error = dealResult.error;
      } else {
        results.deal = { ok: false, error: 'Skipped — no contact ID' };
      }
    } catch (e) {
      results.deal = { ok: false, error: (e as Error).message };
    }

    // Cleanup if requested
    if (cleanup && contactExternalId) {
      try {
        const { Client } = await import('@hubspot/api-client');
        const client = new Client({ accessToken: tokens.accessToken });
        await client.crm.contacts.basicApi.archive(contactExternalId);
        if (results.deal?.id) {
          await client.crm.deals.basicApi.archive(results.deal.id);
        }
      } catch {
        // Best-effort cleanup
      }
    }

    const allOk = Object.values(results).every((r) => r.ok);
    return NextResponse.json({ success: allOk, results });
  } catch (error) {
    console.error('[HubSpot Test] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message, results },
      { status: 500 },
    );
  }
}
